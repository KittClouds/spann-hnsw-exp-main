
export const idleQueue = (fn: () => void, idle = 2000) => {
  let t: ReturnType<typeof setTimeout> | null = null;
  const touch = () => {
    if (t) clearTimeout(t);
    t = setTimeout(fn, idle);
  };
  const flush = () => {
    if (t) clearTimeout(t);
    fn();
  };
  return { touch, flush };
};
