import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

// お絵かき回答用キャンバス。親は ref.getDataURL() / ref.clear() / ref.isBlank() を使える。
const W = 340;
const H = 220;

const DrawCanvas = forwardRef(function DrawCanvas(_, ref) {
  const cvs = useRef(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  const fillWhite = (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
  };

  useEffect(() => {
    const ctx = cvs.current.getContext('2d');
    fillWhite(ctx);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1b2635';
  }, []);

  const posOf = (e) => {
    const r = cvs.current.getBoundingClientRect();
    const src = e.touches && e.touches[0] ? e.touches[0] : e;
    return {
      x: (src.clientX - r.left) * (W / r.width),
      y: (src.clientY - r.top) * (H / r.height),
    };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    dirty.current = true;
    const ctx = cvs.current.getContext('2d');
    const p = posOf(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.1, p.y + 0.1);
    ctx.stroke();
  };
  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = cvs.current.getContext('2d');
    const p = posOf(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };
  const end = () => { drawing.current = false; };

  useImperativeHandle(ref, () => ({
    getDataURL: () => cvs.current.toDataURL('image/png'),
    clear: () => {
      const ctx = cvs.current.getContext('2d');
      fillWhite(ctx);
      ctx.strokeStyle = '#1b2635';
      dirty.current = false;
    },
    isBlank: () => !dirty.current,
  }));

  return (
    <canvas
      ref={cvs}
      width={W}
      height={H}
      className="draw-canvas"
      onMouseDown={start}
      onMouseMove={move}
      onMouseUp={end}
      onMouseLeave={end}
      onTouchStart={start}
      onTouchMove={move}
      onTouchEnd={end}
    />
  );
});

export default DrawCanvas;
