import { useEffect, useState } from 'react';


export function useCountdown(initialSeconds) {
  const [deadline] = useState(() => Date.now() + initialSeconds * 1000); 
  const [left, setLeft] = useState(initialSeconds);

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id); // cleanup: runs on unmount, so no timer leaks
  }, [deadline]);

  return left;
}