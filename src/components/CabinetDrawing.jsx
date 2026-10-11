import {
  BACK,
  FRONT,
  PANEL,
  PLINTH_HEIGHT,
  PLINTH_INSET,
  ROD_DIAMETER,
} from '../utils/cabinetLayout.js';

function Dimension({ x1, y1, x2, y2, offset, label, font }) {
  const horizontal = y1 === y2;
  const dx = horizontal ? 0 : offset;
  const dy = horizontal ? offset : 0;
  const ax = x1 + dx;
  const ay = y1 + dy;
  const bx = x2 + dx;
  const by = y2 + dy;
  const tick = font * 0.45;
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;

  return (
    <g className="drawing-dim">
      <line x1={x1} y1={y1} x2={ax} y2={ay} />
      <line x1={x2} y1={y2} x2={bx} y2={by} />
      <line x1={ax} y1={ay} x2={bx} y2={by} />
      <line x1={ax - tick} y1={ay + tick} x2={ax + tick} y2={ay - tick} />
      <line x1={bx - tick} y1={by + tick} x2={bx + tick} y2={by - tick} />
      <text
        x={horizontal ? mx : mx - font * 0.4}
        y={horizontal ? my - font * 0.4 : my}
        fontSize={font}
        textAnchor="middle"
        transform={horizontal ? undefined : `rotate(-90 ${mx - font * 0.4} ${my})`}
      >
        {Math.round(label)}
      </text>
    </g>
  );
}

export default function CabinetDrawing({ layout }) {
  const { W, H, D, carcassDepth, innerWidth, shelves, doors, drawers, rod, style } =
    layout;
  const font = Math.max(W + D, H) * 0.045;
  const margin = font * 4;
  const gap = font * 5;
  const viewWidth = W + D + gap + margin * 2;
  const viewHeight = H + margin * 2 + font * 2;

  const fx = (x) => margin + W / 2 + x;
  const sx = (z) => margin + W + gap + (z + D / 2);
  const y = (value) => margin + font * 1.5 + (H - value);
  const hidden = style === 'doors' ? 'drawing-hidden' : 'drawing-line';
  const backZ = -D / 2;
  const frontZ = backZ + carcassDepth;

  return (
    <svg
      className="drawing"
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      role="img"
      aria-label={`Чертёж тумбы ${W} × ${H} × ${D} мм`}
    >
      <text
        x={fx(0)}
        y={font * 1.2}
        fontSize={font}
        textAnchor="middle"
        className="drawing-title"
      >
        Вид спереди
      </text>
      <text
        x={sx(0)}
        y={font * 1.2}
        fontSize={font}
        textAnchor="middle"
        className="drawing-title"
      >
        Вид сбоку
      </text>

      <g className="drawing-line">
        <rect x={fx(-W / 2)} y={y(H)} width={W} height={H} />
        <line
          x1={fx(-W / 2 + PANEL)}
          y1={y(H - PANEL)}
          x2={fx(W / 2 - PANEL)}
          y2={y(H - PANEL)}
        />
        <line
          x1={fx(-W / 2 + PANEL)}
          y1={y(H - PANEL)}
          x2={fx(-W / 2 + PANEL)}
          y2={y(0)}
        />
        <line x1={fx(W / 2 - PANEL)} y1={y(H - PANEL)} x2={fx(W / 2 - PANEL)} y2={y(0)} />
        <line
          x1={fx(-W / 2 + PANEL)}
          y1={y(PLINTH_HEIGHT)}
          x2={fx(W / 2 - PANEL)}
          y2={y(PLINTH_HEIGHT)}
        />
        <line
          x1={fx(-W / 2 + PANEL)}
          y1={y(PLINTH_HEIGHT + PANEL)}
          x2={fx(W / 2 - PANEL)}
          y2={y(PLINTH_HEIGHT + PANEL)}
        />
      </g>

      <g className={hidden}>
        {shelves.map((shelfY) => (
          <line
            key={shelfY}
            x1={fx(-innerWidth / 2)}
            y1={y(shelfY)}
            x2={fx(innerWidth / 2)}
            y2={y(shelfY)}
          />
        ))}
        {rod && (
          <line
            x1={fx(-rod.length / 2)}
            y1={y(rod.y)}
            x2={fx(rod.length / 2)}
            y2={y(rod.y)}
          />
        )}
      </g>

      <g className="drawing-front">
        {doors.map((door) => {
          const left = door.sign < 0 ? door.hingeX : door.hingeX - door.width;
          return (
            <rect
              key={door.key}
              x={fx(left)}
              y={y(door.centerY + door.height / 2)}
              width={door.width}
              height={door.height}
            />
          );
        })}
        {drawers.map((drawer) => (
          <rect
            key={drawer.index}
            x={fx(-drawer.width / 2)}
            y={y(drawer.centerY + drawer.height / 2)}
            width={drawer.width}
            height={drawer.height}
          />
        ))}
      </g>

      <g className="drawing-line">
        <rect x={sx(backZ)} y={y(H)} width={carcassDepth} height={H} />
        <line
          x1={sx(backZ + BACK)}
          y1={y(H - PANEL)}
          x2={sx(backZ + BACK)}
          y2={y(PLINTH_HEIGHT + PANEL)}
        />
        <line x1={sx(backZ)} y1={y(H - PANEL)} x2={sx(frontZ)} y2={y(H - PANEL)} />
        <line
          x1={sx(backZ)}
          y1={y(PLINTH_HEIGHT + PANEL)}
          x2={sx(frontZ)}
          y2={y(PLINTH_HEIGHT + PANEL)}
        />
        <rect
          x={sx(frontZ - PLINTH_INSET - PANEL)}
          y={y(PLINTH_HEIGHT)}
          width={PANEL}
          height={PLINTH_HEIGHT}
        />
      </g>
      <g className="drawing-hidden">
        {shelves.map((shelfY) => (
          <line
            key={shelfY}
            x1={sx(backZ + BACK)}
            y1={y(shelfY)}
            x2={sx(backZ + BACK + layout.shelfDepth)}
            y2={y(shelfY)}
          />
        ))}
        {rod && <circle cx={sx(rod.z)} cy={y(rod.y)} r={ROD_DIAMETER / 2} />}
      </g>
      {(doors.length > 0 || drawers.length > 0) && (
        <rect
          className="drawing-front"
          x={sx(D / 2 - FRONT)}
          y={y(H - 2)}
          width={FRONT}
          height={layout.frontHeight}
        />
      )}

      <Dimension
        x1={fx(-W / 2)}
        y1={y(0)}
        x2={fx(W / 2)}
        y2={y(0)}
        offset={font * 2}
        label={W}
        font={font}
      />
      <Dimension
        x1={fx(-W / 2)}
        y1={y(0)}
        x2={fx(-W / 2)}
        y2={y(H)}
        offset={-font * 2}
        label={H}
        font={font}
      />
      <Dimension
        x1={sx(-D / 2)}
        y1={y(0)}
        x2={sx(D / 2)}
        y2={y(0)}
        offset={font * 2}
        label={D}
        font={font}
      />
    </svg>
  );
}
