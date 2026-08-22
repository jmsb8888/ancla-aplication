const CLAVE = "r01:tema";

export type Tema = "claro" | "oscuro";

export function temaGuardado(): Tema {
  const v = localStorage.getItem(CLAVE);
  if (v === "claro" || v === "oscuro") return v;
  // Sin elección previa: oscuro, que es como se trabaja y como se graba el video.
  return "oscuro";
}

export function aplicarTema(tema: Tema) {
  document.documentElement.classList.toggle("dark", tema === "oscuro");
  localStorage.setItem(CLAVE, tema);
}
