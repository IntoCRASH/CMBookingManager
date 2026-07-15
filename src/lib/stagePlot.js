const POSITION_COORDINATES = {
  'Fondo izquierda': [22, 22],
  'Fondo centro': [50, 22],
  'Fondo derecha': [78, 22],
  'Centro izquierda': [22, 49],
  Centro: [50, 49],
  'Centro derecha': [78, 49],
  'Frente izquierda': [22, 74],
  'Frente centro': [50, 74],
  'Frente derecha': [78, 74],
};

const POSITION_OFFSETS = [
  [0, 0],
  [-8, -2],
  [8, -2],
  [-8, 7],
  [8, 7],
  [0, 9],
];

export const STAGE_PLOT_ITEM_TYPES = [
  { value: 'vocal', label: 'Voz / cantante', code: 'VOX' },
  { value: 'drums', label: 'Batería', code: 'DR' },
  { value: 'percussion', label: 'Percusión', code: 'PERC' },
  { value: 'keyboard', label: 'Piano / teclado', code: 'KEY' },
  { value: 'guitar', label: 'Guitarra', code: 'GTR' },
  { value: 'bass', label: 'Bajo', code: 'BASS' },
  { value: 'brass', label: 'Metales', code: 'BR' },
  { value: 'sax', label: 'Saxofón', code: 'SAX' },
  { value: 'strings', label: 'Cuerdas', code: 'STR' },
  { value: 'dj', label: 'DJ / playback', code: 'DJ' },
  { value: 'performer', label: 'Músico / integrante', code: 'MUS' },
  { value: 'microphone', label: 'Micrófono', code: 'MIC' },
  { value: 'monitor', label: 'Monitor de piso', code: 'MON' },
  { value: 'di', label: 'Caja directa', code: 'DI' },
  { value: 'amp', label: 'Amplificador', code: 'AMP' },
  { value: 'power', label: 'Toma eléctrica', code: 'AC' },
  { value: 'riser', label: 'Riser / plataforma', code: 'RISER' },
  { value: 'custom', label: 'Elemento personalizado', code: 'ITEM' },
];

const ITEM_TYPE_MAP = new Map(
  STAGE_PLOT_ITEM_TYPES.map((item) => [item.value, item])
);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function uid(prefix = 'stage-item') {
  if (
    typeof window !== 'undefined' &&
    window.crypto?.randomUUID
  ) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function lower(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function getStagePlotTypeMeta(type) {
  return ITEM_TYPE_MAP.get(type) || ITEM_TYPE_MAP.get('custom');
}

export function inferStagePlotType(member) {
  const source = lower(
    `${member?.funcion || ''} ${member?.instrumento || ''}`
  );

  if (/bateria|drum|bombo|snare|timbal/.test(source)) return 'drums';
  if (/percusion|conga|tambora|guira|bongo|cajon/.test(source)) {
    return 'percussion';
  }
  if (/teclado|piano|keyboard|sintetizador|synth/.test(source)) {
    return 'keyboard';
  }
  if (/contrabajo|bajo|bass/.test(source)) return 'bass';
  if (/guitarra|guitar/.test(source)) return 'guitar';
  if (/sax/.test(source)) return 'sax';
  if (/trompeta|trombon|metales|brass|horn/.test(source)) return 'brass';
  if (/violin|viola|cello|cuerda|string/.test(source)) return 'strings';
  if (/dj|playback|secuencia|tracks/.test(source)) return 'dj';
  if (/voz|vocal|cantante|coros|coro/.test(source)) return 'vocal';

  return 'performer';
}

function dimensionsForType(type) {
  const dimensions = {
    drums: [17, 15],
    percussion: [16, 13],
    keyboard: [18, 10],
    guitar: [14, 11],
    bass: [14, 11],
    brass: [13, 10],
    sax: [13, 10],
    strings: [13, 10],
    vocal: [13, 10],
    performer: [14, 10],
    dj: [17, 11],
    microphone: [5, 8],
    monitor: [10, 6],
    di: [7, 5],
    amp: [11, 8],
    power: [6, 5],
    riser: [22, 18],
    custom: [12, 8],
  };

  return dimensions[type] || dimensions.custom;
}

function normalizedPosition(position, positionIndex = 0) {
  const [baseX, baseY] =
    POSITION_COORDINATES[position] || POSITION_COORDINATES.Centro;
  const [offsetX, offsetY] =
    POSITION_OFFSETS[positionIndex % POSITION_OFFSETS.length];

  return [
    clamp(baseX + offsetX, 7, 93),
    clamp(baseY + offsetY, 8, 88),
  ];
}

function normalizeItem(item, index = 0) {
  const type = ITEM_TYPE_MAP.has(item?.type) ? item.type : 'custom';
  const [defaultWidth, defaultHeight] = dimensionsForType(type);

  return {
    id: String(item?.id || uid(`stage-${index + 1}`)),
    type,
    label: String(
      item?.label || getStagePlotTypeMeta(type).label || 'Elemento'
    ).trim(),
    detail: String(item?.detail || '').trim(),
    x: clamp(item?.x ?? 50, 3, 97),
    y: clamp(item?.y ?? 50, 4, 94),
    width: clamp(item?.width ?? defaultWidth, 4, 34),
    height: clamp(item?.height ?? defaultHeight, 4, 26),
    rotation: clamp(item?.rotation ?? 0, -180, 180),
    linked: Boolean(item?.linked),
    source_member_id: item?.source_member_id
      ? String(item.source_member_id)
      : null,
    source_role: item?.source_role ? String(item.source_role) : null,
    monitor: String(item?.monitor || '').trim(),
    channels: Math.max(0, Number(item?.channels || 0)),
    orphaned: Boolean(item?.orphaned),
  };
}

function memberId(member, index) {
  return String(member?.id || `integrante-${index + 1}`);
}

function hasText(value, pattern) {
  return pattern.test(lower(value));
}

function createLinkedItem({
  id,
  type,
  label,
  detail,
  x,
  y,
  width,
  height,
  member,
  role,
}) {
  const [defaultWidth, defaultHeight] = dimensionsForType(type);

  return normalizeItem({
    id,
    type,
    label,
    detail,
    x,
    y,
    width: width || defaultWidth,
    height: height || defaultHeight,
    linked: true,
    source_member_id: member.id,
    source_role: role,
    monitor: member.monitor,
    channels: member.canales,
  });
}

function generateItemsForMember(member, index, occupancy) {
  const id = memberId(member, index);
  const position = member?.posicion || 'Centro';
  const positionIndex = occupancy.get(position) || 0;
  occupancy.set(position, positionIndex + 1);

  const [x, y] = normalizedPosition(position, positionIndex);
  const type = inferStagePlotType(member);
  const instrument = String(member?.instrumento || '').trim();
  const role = String(member?.funcion || '').trim();
  const connection = lower(member?.conexion);
  const requirements = lower(member?.requerimientos);
  const items = [];

  if (type === 'drums') {
    items.push(
      createLinkedItem({
        id: `riser:${id}`,
        type: 'riser',
        label: 'Riser batería',
        detail: 'Plataforma',
        x,
        y,
        width: 22,
        height: 18,
        member: { ...member, id },
        role: 'riser',
      })
    );
  }

  items.push(
    createLinkedItem({
      id: `performer:${id}`,
      type,
      label: role || instrument || `Integrante ${index + 1}`,
      detail: instrument,
      x,
      y,
      member: { ...member, id },
      role: 'performer',
    })
  );

  if (String(member?.monitor || '').trim()) {
    items.push(
      createLinkedItem({
        id: `monitor:${id}`,
        type: 'monitor',
        label: member.monitor,
        detail: member.prioridad_monitor || role,
        x,
        y: clamp(y + 10, 8, 93),
        member: { ...member, id },
        role: 'monitor',
      })
    );
  }

  if (
    connection.includes('microfono') ||
    type === 'vocal' ||
    Boolean(member?.hace_coros)
  ) {
    items.push(
      createLinkedItem({
        id: `microphone:${id}`,
        type: 'microphone',
        label: type === 'vocal' ? 'Mic voz' : 'Mic',
        detail: member.conexion || 'Micrófono',
        x: clamp(x + (type === 'drums' ? 7 : 0), 5, 95),
        y: clamp(y + 5, 7, 92),
        member: { ...member, id },
        role: 'microphone',
      })
    );
  }

  if (connection.includes('di')) {
    items.push(
      createLinkedItem({
        id: `di:${id}`,
        type: 'di',
        label: connection.includes('estereo') ? 'DI L/R' : 'DI',
        detail: member.conexion,
        x: clamp(x + 9, 6, 94),
        y: clamp(y + 1, 6, 92),
        member: { ...member, id },
        role: 'di',
      })
    );
  }

  if (
    ['guitar', 'bass'].includes(type) &&
    (requirements.includes('amplificador') || type === 'guitar' || type === 'bass')
  ) {
    items.push(
      createLinkedItem({
        id: `amp:${id}`,
        type: 'amp',
        label: type === 'bass' ? 'Amp bajo' : 'Amp guitarra',
        detail: role,
        x,
        y: clamp(y - 10, 7, 90),
        member: { ...member, id },
        role: 'amp',
      })
    );
  }

  if (
    type === 'keyboard' ||
    hasText(requirements, /toma|corriente|electric|ac|energia/)
  ) {
    items.push(
      createLinkedItem({
        id: `power:${id}`,
        type: 'power',
        label: 'AC',
        detail: 'Toma eléctrica',
        x: clamp(x - 9, 6, 94),
        y: clamp(y + 1, 6, 92),
        member: { ...member, id },
        role: 'power',
      })
    );
  }

  return items;
}

export function generateStagePlotFromRider(riderConfig = {}) {
  const integrantes = Array.isArray(riderConfig?.integrantes)
    ? riderConfig.integrantes
    : [];
  const stage = riderConfig?.tarima || {};
  const occupancy = new Map();

  const items = integrantes.flatMap((member, index) =>
    generateItemsForMember(member, index, occupancy)
  );

  return {
    version: 1,
    width_m: Math.max(1, Number(stage.ancho_metros || 6)),
    depth_m: Math.max(1, Number(stage.fondo_metros || 4)),
    orientation: 'audience-bottom',
    title: 'Stage Plot principal',
    notes:
      'Distribución referencial. Ajustar a las dimensiones y condiciones reales de la tarima.',
    generated_from_rider_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items,
  };
}

export function normalizeStagePlot(stagePlot, riderConfig = {}) {
  if (
    !stagePlot ||
    typeof stagePlot !== 'object' ||
    !Array.isArray(stagePlot.items) ||
    stagePlot.items.length === 0
  ) {
    return generateStagePlotFromRider(riderConfig);
  }

  const stage = riderConfig?.tarima || {};

  return {
    version: 1,
    width_m: Math.max(
      1,
      Number(stagePlot.width_m || stage.ancho_metros || 6)
    ),
    depth_m: Math.max(
      1,
      Number(stagePlot.depth_m || stage.fondo_metros || 4)
    ),
    orientation: 'audience-bottom',
    title: String(stagePlot.title || 'Stage Plot principal'),
    notes: String(stagePlot.notes || ''),
    generated_from_rider_at:
      stagePlot.generated_from_rider_at || null,
    updated_at: stagePlot.updated_at || null,
    pdf_path: stagePlot.pdf_path || null,
    pdf_generado_at: stagePlot.pdf_generado_at || null,
    items: stagePlot.items.map(normalizeItem),
  };
}

export function syncStagePlotWithRider(stagePlot, riderConfig = {}) {
  const current = normalizeStagePlot(stagePlot, riderConfig);
  const generated = generateStagePlotFromRider(riderConfig);
  const currentById = new Map(
    current.items.map((item) => [String(item.id), item])
  );
  const generatedIds = new Set(
    generated.items.map((item) => String(item.id))
  );

  const syncedItems = generated.items.map((generatedItem) => {
    const existing = currentById.get(String(generatedItem.id));

    if (!existing) return generatedItem;

    return normalizeItem({
      ...generatedItem,
      x: existing.x,
      y: existing.y,
      width: existing.width,
      height: existing.height,
      rotation: existing.rotation,
      orphaned: false,
    });
  });

  current.items.forEach((item) => {
    const id = String(item.id);

    if (!item.linked) {
      syncedItems.push(normalizeItem(item));
      return;
    }

    if (!generatedIds.has(id)) {
      syncedItems.push(
        normalizeItem({
          ...item,
          orphaned: true,
        })
      );
    }
  });

  return {
    ...current,
    width_m: Math.max(
      1,
      Number(current.width_m || generated.width_m)
    ),
    depth_m: Math.max(
      1,
      Number(current.depth_m || generated.depth_m)
    ),
    generated_from_rider_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: syncedItems,
  };
}

export function createManualStagePlotItem(type = 'custom', overrides = {}) {
  const safeType = ITEM_TYPE_MAP.has(type) ? type : 'custom';
  const [width, height] = dimensionsForType(safeType);
  const meta = getStagePlotTypeMeta(safeType);

  return normalizeItem({
    id: uid(`manual-${safeType}`),
    type: safeType,
    label: overrides.label || meta.label,
    detail: overrides.detail || '',
    x: overrides.x ?? 50,
    y: overrides.y ?? 50,
    width: overrides.width ?? width,
    height: overrides.height ?? height,
    rotation: overrides.rotation ?? 0,
    linked: false,
  });
}

export function sortStagePlotItems(items = []) {
  const order = {
    riser: 0,
    power: 1,
    amp: 2,
    di: 3,
    performer: 4,
    vocal: 4,
    drums: 4,
    percussion: 4,
    keyboard: 4,
    guitar: 4,
    bass: 4,
    brass: 4,
    sax: 4,
    strings: 4,
    dj: 4,
    custom: 5,
    microphone: 6,
    monitor: 7,
  };

  return [...items].sort(
    (a, b) =>
      (order[a?.type] ?? 5) - (order[b?.type] ?? 5)
  );
}
