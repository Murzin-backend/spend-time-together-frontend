import React from 'react';
import './WheelOfFortune.css';

export interface WheelVariant {
    userId: number;
    name: string;
    image: string | null;
    by: string;
    color: string;
    isEliminated: boolean;
    online: boolean;
    metacritic?: number;
}

interface Props {
    variants: WheelVariant[];
    winnerId: number | null;
    spinning: boolean;
    onSelect: (userId: number) => void;
}

const R = 47;
const C = 50;
const PALETTE = ['#7c4dff', '#e0a53a', '#26a69a', '#66bb6a', '#ec6a5e', '#4c9ffe', '#f0883e', '#a371f7'];

const ptR = (deg: number, r: number): [number, number] => {
    const a = (deg - 90) * Math.PI / 180;
    return [C + r * Math.cos(a), C + r * Math.sin(a)];
};
const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

const WheelOfFortune: React.FC<Props> = ({ variants, winnerId, spinning, onSelect }) => {
    const initial = variants.filter(v => !v.isEliminated).map(v => v.userId);
    const [displayIds, setDisplayIds] = React.useState<number[]>(initial);
    const [rot, setRot] = React.useState(0);
    const [doomedId, setDoomedId] = React.useState<number | null>(null);
    const rotRef = React.useRef(0);
    const processing = React.useRef(false);
    const displayRef = React.useRef<number[]>(initial);
    displayRef.current = displayIds;

    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    const byId = (id: number) => variants.find(v => v.userId === id);

    React.useEffect(() => {
        if (processing.current) return;
        const activeNow = variants.filter(v => !v.isEliminated).map(v => v.userId);
        const missing = displayRef.current.some(id => !activeNow.includes(id));
        const extra = activeNow.some(id => !displayRef.current.includes(id));
        if (missing || extra) {
            setDisplayIds(() => {
                const kept = displayRef.current.filter(id => activeNow.includes(id));
                activeNow.forEach(id => { if (!kept.includes(id)) kept.push(id); });
                return kept;
            });
        }
    }, [variants]);

    React.useEffect(() => {
        if (processing.current) return;
        const toRemove = displayRef.current.filter(id => {
            const v = byId(id);
            return v && v.isEliminated;
        });
        if (!toRemove.length) return;
        processing.current = true;
        (async () => {
            for (const id of toRemove) {
                const cur = displayRef.current;
                const k = cur.indexOf(id);
                if (k === -1) continue;
                const seg = 360 / cur.length;
                const desired = -(k * seg + seg / 2);
                const c = rotRef.current;
                const base = c - (((c % 360) + 360) % 360);
                let target = base + (((desired % 360) + 360) % 360);
                while (target <= c + 360 * 3) target += 360;
                rotRef.current = target;
                setRot(target);
                await sleep(reduced ? 30 : 4300);
                setDoomedId(id);
                await sleep(reduced ? 20 : 650);
                setDoomedId(null);
                displayRef.current = displayRef.current.filter(x => x !== id);
                setDisplayIds(displayRef.current.slice());
                await sleep(reduced ? 20 : 420);
            }
            processing.current = false;
        })();
    }, [variants, displayIds, reduced]);

    const active = displayIds.map(id => byId(id)).filter((v): v is WheelVariant => !!v);
    const seg = active.length ? 360 / active.length : 360;
    const isWinner = active.length === 1 && winnerId != null && active[0].userId === winnerId;
    const winnerV = winnerId != null ? byId(winnerId) : null;

    const fillFor = (v: WheelVariant) => v.image ? `url(#wof-img-${v.userId})` : `url(#wof-gr-${v.userId})`;

    return (
        <div className="wof">
            <div className="wof-col">
                <div className="wof-wrap">
                    <div className="wof-ptr" />
                    <div
                        className="wof-spin"
                        style={{ transform: `rotate(${rot}deg)`, transition: reduced ? 'none' : 'transform 4.2s cubic-bezier(.12,.8,.14,1)' }}
                    >
                        <svg key={active.length} viewBox="0 0 100 100">
                            <defs>
                                {active.map(v => v.image ? (
                                    <pattern key={v.userId} id={`wof-img-${v.userId}`} patternUnits="userSpaceOnUse" width="100" height="100">
                                        <image href={v.image} x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" />
                                        <rect x="0" y="0" width="100" height="100" fill="#000" opacity="0.18" />
                                    </pattern>
                                ) : (
                                    <radialGradient key={v.userId} id={`wof-gr-${v.userId}`} cx="50%" cy="25%" r="85%">
                                        <stop offset="0%" stopColor={v.color} />
                                        <stop offset="100%" stopColor={v.color} stopOpacity="0.55" />
                                    </radialGradient>
                                ))}
                            </defs>
                            <circle cx={C} cy={C} r={R} fill="#0d1219" />
                            {active.length === 0 && (
                                <text x={C} y={C} textAnchor="middle" dominantBaseline="central" fontSize="6" fill="#59626f">нет вариантов</text>
                            )}
                            {active.length === 1 ? (
                                <>
                                    <circle
                                        className="wof-slice"
                                        cx={C} cy={C} r={R}
                                        fill={fillFor(active[0])}
                                        stroke={isWinner ? '#f5c04a' : 'none'}
                                        strokeWidth={isWinner ? 1.6 : 0}
                                        onClick={() => !spinning && onSelect(active[0].userId)}
                                    />
                                    {!active[0].image && (
                                        <text x={C} y={C} textAnchor="middle" dominantBaseline="central" fontSize="9" fill="#fff" className="wof-label">
                                            {active[0].name.slice(0, 14)}
                                        </text>
                                    )}
                                </>
                            ) : active.map((v, i) => {
                                const [x1, y1] = ptR(i * seg, R);
                                const [x2, y2] = ptR((i + 1) * seg, R);
                                const d = `M${C},${C} L${x1.toFixed(3)},${y1.toFixed(3)} A${R},${R} 0 0 1 ${x2.toFixed(3)},${y2.toFixed(3)} Z`;
                                return (
                                    <path
                                        key={v.userId}
                                        d={d}
                                        fill={fillFor(v)}
                                        stroke="#0d1219"
                                        strokeWidth="0.6"
                                        className={doomedId === v.userId ? 'wof-slice wof-doomed' : 'wof-slice'}
                                        onClick={() => !spinning && onSelect(v.userId)}
                                    />
                                );
                            })}
                            <ellipse cx="38" cy="30" rx="34" ry="24" fill="#ffffff" opacity="0.05" pointerEvents="none" />
                        </svg>
                    </div>
                    <div className="wof-hub">🎲</div>
                </div>
                <div className={`wof-status ${isWinner ? 'win' : ''} ${spinning ? 'spin' : ''}`}>
                    {isWinner && winnerV
                        ? <span>🏆 Победила: <b>{winnerV.name}</b> — от {winnerV.by}</span>
                        : spinning
                            ? <span>🎡 Крутим колесо…</span>
                            : <span>Проигравшие выбывают — останется победитель</span>}
                </div>
            </div>

            <div className="wof-legend-col">
                <div className="wof-legend-head">Варианты <small>кликните, чтобы открыть</small></div>
                <div className="wof-legend">
                    {variants.map((v, i) => (
                        <div
                            key={v.userId}
                            className={`wof-lrow ${v.isEliminated ? 'dead' : ''} ${v.userId === winnerId ? 'win' : ''}`}
                            onClick={() => onSelect(v.userId)}
                        >
                            <span className="wof-lthumb" style={v.image ? { backgroundImage: `url(${v.image})` } : { background: `linear-gradient(140deg, ${v.color}, ${v.color}66)` }}>
                                {!v.image && '🎮'}
                            </span>
                            <div className="wof-lbody">
                                <div className="wof-lname">{v.name}</div>
                                <div className={`wof-lby ${v.online ? '' : 'off'}`}>{v.by}{v.online ? '' : ' · не в сети'}</div>
                            </div>
                            {v.isEliminated
                                ? <span className="wof-ltag">выбыл</span>
                                : (v.metacritic ? <span className="wof-lmc">{v.metacritic}</span> : null)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WheelOfFortune;
