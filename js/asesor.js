// "Hablar con un asesor": panel con los canales de la sede. En la demo no envía nada.
(() => {
  const dialogo = document.getElementById('asesor');
  const texto = document.getElementById('asesor-texto');
  const estado = document.getElementById('asesor-demo');
  const BASE = 'Una persona de la sede te resuelve dudas, te cotiza y agenda tu prueba de manejo.';
  let moto = '';

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-asesor]');
    if (!b) return;
    moto = b.dataset.asesor || '';
    const sede = b.dataset.sede || '';
    texto.textContent = sede && b.dataset.abierta === 'false'
      ? `Te comunicamos con el equipo de ${sede}: te avisamos el día que abra y, mientras tanto, te atiende un asesor en línea.`
      : sede
      ? `Te comunicamos con el equipo de ${sede} para que elijas día y hora. ${BASE}`
      : moto
        ? `El asesor sabrá que te interesa la ${moto}, así no empiezas de cero. ${BASE}`
        : BASE;
    estado.textContent = 'Demo: en la versión final cada opción abre el canal real de la sede.';
    dialogo.showModal();
  });

  dialogo.addEventListener('click', (e) => {
    const c = e.target.closest('[data-canal]');
    if (c) {
      const mensaje = moto ? `«Hola, me interesa la KOVE ${moto}»` : '«Hola, quiero hablar con un asesor»';
      const canal = c.dataset.canal;
      // "Agendar visita" lleva al buscador de vitrinas
      if (canal === 'Visita' && !texto.textContent.startsWith('Te comunicamos')) {
        dialogo.close();
        if (document.body.classList.contains('en-detalle')) document.getElementById('volver').click();
        setTimeout(() => document.getElementById('concesionarios').scrollIntoView({ behavior: 'smooth' }), 350);
        return;
      }
      estado.textContent = canal === 'WhatsApp'
        ? `Demo: aquí se abriría WhatsApp de la sede con el mensaje ${mensaje}.`
        : canal === 'Videollamada'
          ? 'Demo: aquí se conectaría la videollamada con el primer asesor disponible.'
          : 'Demo: aquí se abriría la agenda de la sede para elegir día y hora.';
      return;
    }
    // clic en el fondo oscuro cierra
    if (e.target === dialogo) dialogo.close();
  });
})();
