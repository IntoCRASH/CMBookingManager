import { supabase } from './supabaseClient';
import { requireWorkspaceId } from './workspaceService';

const DAY_MS = 24 * 60 * 60 * 1000;
const FOLLOW_UP_DAYS = 2;

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseDateOnly(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!match) return null;

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    12,
    0,
    0,
    0
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

function todayAtNoon() {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
    0,
    0,
    0
  );
}

function daysUntil(dateValue) {
  const date = parseDateOnly(dateValue);
  if (!date) return null;
  return Math.round((date.getTime() - todayAtNoon().getTime()) / DAY_MS);
}

function daysSince(dateValue) {
  if (!dateValue) return 0;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 0;

  return Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / DAY_MS)
  );
}

function formatDate(dateValue) {
  const date = parseDateOnly(dateValue);
  if (!date) return 'sin fecha definida';

  return date.toLocaleDateString('es-DO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatMoney(value) {
  return `RD$ ${Number(value || 0).toLocaleString('es-DO', {
    maximumFractionDigits: 2,
  })}`;
}

function quoteLabel(quote) {
  return quote?.numero || `#${quote?.id || ''}`;
}

function clientLabel(quote) {
  return (
    quote?.clientes?.nombre ||
    quote?.clientes?.empresa ||
    'Cliente sin nombre'
  );
}

function eventLabel(quote) {
  return (
    quote?.nombre_evento ||
    quote?.tipo_evento ||
    'Evento'
  );
}

function relativeEventLabel(days, dateValue) {
  if (days === null) return 'sin fecha definida';
  if (days < -1) return `ocurrió hace ${Math.abs(days)} días`;
  if (days === -1) return 'ocurrió ayer';
  if (days === 0) return 'es hoy';
  if (days === 1) return 'es mañana';
  return `es en ${days} días (${formatDate(dateValue)})`;
}

function latestByQuote(rows) {
  const map = new Map();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const key = String(row?.cotizacion_id || '');
    if (!key) return;

    const current = map.get(key);
    const rowTime = new Date(row?.created_at || 0).getTime();
    const currentTime = new Date(current?.created_at || 0).getTime();

    if (!current || rowTime >= currentTime) {
      map.set(key, row);
    }
  });

  return map;
}

function paymentsByQuote(rows) {
  const map = new Map();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const key = String(row?.cotizacion_id || '');
    if (!key) return;

    map.set(key, (map.get(key) || 0) + Number(row?.monto || 0));
  });

  return map;
}

function makeNotification({
  id,
  type,
  severity = 'info',
  icon = 'bell',
  title,
  description,
  meta = '',
  action,
  sortDate = null,
}) {
  return {
    id,
    type,
    severity,
    icon,
    title,
    description,
    meta,
    action,
    sortDate,
  };
}

function buildQuoteNotifications({
  quotes,
  payments,
  contracts,
  riders,
}) {
  const notifications = [];
  const paidByQuote = paymentsByQuote(payments);
  const contractByQuote = latestByQuote(contracts);
  const riderByQuote = latestByQuote(riders);

  (Array.isArray(quotes) ? quotes : []).forEach((quote) => {
    const quoteId = String(quote?.id || '');
    if (!quoteId) return;

    const state = normalizeText(quote.estado);
    const documentType = normalizeText(quote.documento_tipo || 'cotizacion');
    const eventDays = daysUntil(quote.fecha_evento);
    const stateAge = daysSince(quote.updated_at || quote.created_at);
    const creationAge = daysSince(quote.created_at);
    const isCancelled = state === 'cancelada';
    const isApproved = ['confirmada', 'aprobada'].includes(state);
    const isPending = ['pendiente', 'pendiente de aprobacion'].includes(state);
    const isCompleted = state === 'realizada';
    const label = quoteLabel(quote);
    const client = clientLabel(quote);
    const event = eventLabel(quote);
    const eventMeta = relativeEventLabel(eventDays, quote.fecha_evento);
    const sortDate = quote.fecha_evento || quote.updated_at || quote.created_at;

    if (!isCancelled && isPending && eventDays !== null && eventDays < 0) {
      notifications.push(
        makeNotification({
          id: `past-event-open:${quoteId}`,
          type: 'past-event-open',
          severity: 'critical',
          icon: 'calendar',
          title: `Evento pasado sin cerrar: ${label}`,
          description:
            `${client} · ${event} ${eventMeta}. ` +
            `La cotización continúa en estado ${quote.estado || 'Pendiente'}.`,
          meta: formatDate(quote.fecha_evento),
          action: {
            kind: 'quote',
            quoteId: quote.id,
            label: 'Revisar cotización',
          },
          sortDate,
        })
      );
    } else if (
      !isCancelled &&
      isPending &&
      (
        creationAge >= FOLLOW_UP_DAYS ||
        (eventDays !== null && eventDays >= 0 && eventDays <= 7)
      )
    ) {
      const urgent = eventDays !== null && eventDays >= 0 && eventDays <= 3;
      const waitingText =
        creationAge === 1
          ? 'lleva 1 día pendiente'
          : `lleva ${creationAge} días pendiente`;

      notifications.push(
        makeNotification({
          id: `quote-follow-up:${quoteId}`,
          type: 'quote-follow-up',
          severity: urgent ? 'critical' : 'warning',
          icon: 'quote',
          title:
            state === 'pendiente de aprobacion'
              ? `Esperando aprobación: ${label}`
              : `Dar seguimiento a ${label}`,
          description:
            `${client} · ${event}. La propuesta ${waitingText}` +
            (eventDays !== null ? ` y el evento ${eventMeta}.` : '.'),
          meta: quote.estado || 'Pendiente',
          action: {
            kind: 'quote',
            quoteId: quote.id,
            label: 'Abrir seguimiento',
          },
          sortDate,
        })
      );
    }

    if (
      !isCancelled &&
      eventDays !== null &&
      eventDays < 0 &&
      !isCompleted &&
      !isPending
    ) {
      notifications.push(
        makeNotification({
          id: `event-close:${quoteId}`,
          type: 'event-close',
          severity: 'critical',
          icon: 'event',
          title: `Marca el evento como realizado: ${label}`,
          description:
            `${client} · ${event} ${eventMeta}, pero todavía figura como ` +
            `${quote.estado || 'activo'}.`,
          meta: formatDate(quote.fecha_evento),
          action: {
            kind: 'quote',
            quoteId: quote.id,
            label: 'Actualizar estado',
          },
          sortDate,
        })
      );
    }

    if (
      !isCancelled &&
      isApproved &&
      eventDays !== null &&
      eventDays >= 0 &&
      eventDays <= 7
    ) {
      notifications.push(
        makeNotification({
          id: `upcoming-event:${quoteId}:${eventDays <= 1 ? 'imminent' : 'week'}`,
          type: 'upcoming-event',
          severity:
            eventDays <= 1
              ? 'critical'
              : eventDays <= 3
                ? 'warning'
                : 'info',
          icon: 'calendar',
          title:
            eventDays === 0
              ? `Evento de hoy: ${label}`
              : eventDays === 1
                ? `Evento de mañana: ${label}`
                : `Evento próximo: ${label}`,
          description: `${client} · ${event} ${eventMeta}.`,
          meta: quote.venue || formatDate(quote.fecha_evento),
          action: {
            kind: 'quote',
            quoteId: quote.id,
            label: 'Ver detalles',
          },
          sortDate,
        })
      );
    }

    const total = Number(quote.total || 0);
    const paid = Number(paidByQuote.get(quoteId) || 0);
    const balance = Math.max(total - paid, 0);
    const collectionState = state === 'pendiente de cobro';
    const collectionEligible =
      isApproved ||
      collectionState ||
      isCompleted ||
      documentType === 'factura';
    const collectionDue =
      (collectionState && stateAge >= 1) ||
      (eventDays !== null && eventDays <= 7) ||
      isCompleted;

    if (
      !isCancelled &&
      collectionEligible &&
      total > 0 &&
      balance > 0.5 &&
      collectionDue
    ) {
      const critical =
        isCompleted ||
        (eventDays !== null && eventDays <= 1);

      notifications.push(
        makeNotification({
          id: `balance-pending:${quoteId}`,
          type: 'balance-pending',
          severity: critical ? 'critical' : 'warning',
          icon: 'money',
          title: `Balance pendiente: ${label}`,
          description:
            `${client} tiene ${formatMoney(balance)} pendiente` +
            (eventDays !== null ? ` y el evento ${eventMeta}.` : '.'),
          meta: `${formatMoney(paid)} pagado de ${formatMoney(total)}`,
          action: {
            kind: 'payments',
            quoteId: quote.id,
            label: 'Registrar o revisar pagos',
          },
          sortDate,
        })
      );
    }

    if (
      !isCancelled &&
      state === 'aprobada' &&
      documentType !== 'factura'
    ) {
      notifications.push(
        makeNotification({
          id: `ready-to-invoice:${quoteId}`,
          type: 'ready-to-invoice',
          severity: 'info',
          icon: 'documents',
          title: `Lista para facturar: ${label}`,
          description:
            `${client} aprobó la cotización. Puedes convertirla en factura ` +
            `cuando corresponda.`,
          meta: quote.estado,
          action: {
            kind: 'quote',
            quoteId: quote.id,
            label: 'Emitir factura',
          },
          sortDate,
        })
      );
    }

    if (
      isApproved &&
      eventDays !== null &&
      eventDays >= 0 &&
      eventDays <= 14
    ) {
      const contract = contractByQuote.get(quoteId);
      const contractState = normalizeText(contract?.estado);

      if (!contract) {
        notifications.push(
          makeNotification({
            id: `missing-contract:${quoteId}`,
            type: 'missing-contract',
            severity: eventDays <= 7 ? 'warning' : 'info',
            icon: 'documents',
            title: `Falta generar el contrato: ${label}`,
            description:
              `${client} · ${event} ${eventMeta}. Todavía no hay un contrato guardado.`,
            meta: formatDate(quote.fecha_evento),
            action: {
              kind: 'documents',
              section: 'contratos',
              label: 'Ir a contratos',
            },
            sortDate,
          })
        );
      } else if (!contract.enviado_at && eventDays <= 7) {
        notifications.push(
          makeNotification({
            id: `contract-not-sent:${quoteId}`,
            type: 'contract-not-sent',
            severity: eventDays <= 3 ? 'critical' : 'warning',
            icon: 'documents',
            title: `Contrato pendiente de envío: ${label}`,
            description:
              `El contrato de ${client} está generado, pero todavía no se ha enviado.`,
            meta: eventMeta,
            action: {
              kind: 'documents',
              section: 'contratos',
              label: 'Enviar contrato',
            },
            sortDate,
          })
        );
      } else if (
        contract.enviado_at &&
        !contract.firmado_at &&
        contractState !== 'firmado' &&
        eventDays <= 3
      ) {
        notifications.push(
          makeNotification({
            id: `contract-not-signed:${quoteId}`,
            type: 'contract-not-signed',
            severity: 'critical',
            icon: 'documents',
            title: `Contrato pendiente de firma: ${label}`,
            description:
              `El evento ${eventMeta} y el contrato enviado a ${client} aún no figura firmado.`,
            meta: formatDate(quote.fecha_evento),
            action: {
              kind: 'documents',
              section: 'contratos',
              label: 'Revisar contrato',
            },
            sortDate,
          })
        );
      }

      if (quote.formato_id && eventDays <= 10) {
        const rider = riderByQuote.get(quoteId);

        if (!rider) {
          notifications.push(
            makeNotification({
              id: `missing-rider:${quoteId}`,
              type: 'missing-rider',
              severity: eventDays <= 5 ? 'warning' : 'info',
              icon: 'documents',
              title: `Falta generar el rider: ${label}`,
              description:
                `${client} · ${event} ${eventMeta}. No hay rider técnico guardado para este evento.`,
              meta: formatDate(quote.fecha_evento),
              action: {
                kind: 'documents',
                section: 'riders',
                label: 'Ir a riders',
              },
              sortDate,
            })
          );
        } else if (!rider.enviado_at && eventDays <= 5) {
          notifications.push(
            makeNotification({
              id: `rider-not-sent:${quoteId}`,
              type: 'rider-not-sent',
              severity: eventDays <= 2 ? 'critical' : 'warning',
              icon: 'documents',
              title: `Rider pendiente de envío: ${label}`,
              description:
                `El rider de ${client} está generado, pero todavía no se ha enviado.`,
              meta: eventMeta,
              action: {
                kind: 'documents',
                section: 'riders',
                label: 'Enviar rider',
              },
              sortDate,
            })
          );
        }
      }
    }
  });

  const severityOrder = {
    critical: 0,
    warning: 1,
    info: 2,
  };

  return notifications.sort((a, b) => {
    const severityDifference =
      (severityOrder[a.severity] ?? 9) -
      (severityOrder[b.severity] ?? 9);

    if (severityDifference !== 0) return severityDifference;

    const dateA = new Date(a.sortDate || '2999-12-31').getTime();
    const dateB = new Date(b.sortDate || '2999-12-31').getTime();

    if (dateA !== dateB) return dateA - dateB;
    return a.title.localeCompare(b.title, 'es');
  });
}

async function optionalWorkspaceQuery(table, select, workspaceId) {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.warn(`No se pudo consultar ${table} para notificaciones:`, error);
    return [];
  }

  return data || [];
}

export async function getWorkspaceNotifications(workspaceId) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);

  const { data: quotes, error: quotesError } = await supabase
    .from('cotizaciones')
    .select(`
      id,
      numero,
      documento_tipo,
      estado,
      fecha_evento,
      created_at,
      updated_at,
      total,
      nombre_evento,
      tipo_evento,
      venue,
      incluye_sonido,
      formato_id,
      clientes (
        nombre,
        empresa,
        email
      )
    `)
    .eq('workspace_id', currentWorkspaceId)
    .order('fecha_evento', { ascending: true, nullsFirst: false });

  if (quotesError) throw quotesError;

  const [payments, contracts, riders] = await Promise.all([
    optionalWorkspaceQuery(
      'pagos',
      'cotizacion_id,monto,fecha,created_at',
      currentWorkspaceId
    ),
    optionalWorkspaceQuery(
      'contratos',
      'id,cotizacion_id,estado,enviado_at,firmado_at,created_at',
      currentWorkspaceId
    ),
    optionalWorkspaceQuery(
      'riders_tecnicos',
      'id,cotizacion_id,estado,enviado_at,confirmado_at,created_at',
      currentWorkspaceId
    ),
  ]);

  return buildQuoteNotifications({
    quotes: quotes || [],
    payments,
    contracts,
    riders,
  });
}

export function subscribeToWorkspaceNotificationChanges(
  workspaceId,
  onChange
) {
  const currentWorkspaceId = requireWorkspaceId(workspaceId);
  const callback = typeof onChange === 'function' ? onChange : () => {};
  const channelName = `mibooking-notifications-${currentWorkspaceId}-${Date.now()}`;
  let timeoutId = null;

  function scheduleRefresh() {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(callback, 450);
  }

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'cotizaciones',
        filter: `workspace_id=eq.${currentWorkspaceId}`,
      },
      scheduleRefresh
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'pagos',
        filter: `workspace_id=eq.${currentWorkspaceId}`,
      },
      scheduleRefresh
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'contratos',
        filter: `workspace_id=eq.${currentWorkspaceId}`,
      },
      scheduleRefresh
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'riders_tecnicos',
        filter: `workspace_id=eq.${currentWorkspaceId}`,
      },
      scheduleRefresh
    )
    .subscribe();

  return () => {
    window.clearTimeout(timeoutId);
    supabase.removeChannel(channel);
  };
}
