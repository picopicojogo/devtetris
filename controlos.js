import { verificarColisao, rodar } from "./motor.js";
import { tocarSomRodar } from "./audio.js";

// Estado actual do modo táctil arcade (activo ou não)
let modoArcadeTatil = true;

/**
 * Vibra o dispositivo, se o modo estiver activo e o navegador suportar vibração
 * @param {number|Array<number>} padrao - duração ou sequência de vibração
 */
function vibrar(padrao) {
  if (!modoArcadeTatil || !navigator.vibrate) return;
  navigator.vibrate(padrao);
}

/**
 * Tenta mover a peça lateralmente na direcção indicada
 * @param {number} direcao -1 para esquerda, +1 para direita
 */
export function moverPeca(direcao, tabuleiro, peca, posicao) {
  posicao.x += direcao;
  if (verificarColisao(tabuleiro, peca, posicao)) {
    posicao.x -= direcao;
  } else {
    vibrar(20);
  }
}

/**
 * Tenta rodar a peça na direcção desejada
 * Produz som e vibração apenas se a rotação for válida
 */
export function rodarPeca(direcao, peca, tabuleiro, posicao) {
  const rodada = rodar(peca, direcao);
  if (verificarColisao(tabuleiro, rodada, posicao)) return peca;
  tocarSomRodar();
  vibrar(30);
  return rodada;
}

/**
 * Tenta descer a peça uma linha
 * Se travar, retorna verdadeiro
 */
export function descerPeca(tabuleiro, peca, posicao) {
  posicao.y++;
  if (verificarColisao(tabuleiro, peca, posicao)) {
    posicao.y--;
    vibrar([60, 30, 60]);
    return true;
  }
  return false;
}

/**
 * Configura todos os tipos de controlo do jogo:
 * - Teclado físico
 * - Botões visuais com repetição
 * - Gestos tácteis no canvas principal
 * - Alternador para activar/desactivar modo táctil arcade
 */
export function configurarControlos(moverFn, rodarFn, descerFn, quedaFn, pausarFn) {
  // Controlo via teclado físico
  window.addEventListener("keydown", e => {
    const tecla = e.code.toLowerCase();
    if (["arrowleft", "arrowright", "arrowup", "arrowdown", "space"].includes(tecla)) {
      e.preventDefault();
    }
    if (e.repeat) return;

    switch (tecla) {
      case "arrowleft":  moverFn(-1); break;
      case "arrowright": moverFn(1); break;
      case "arrowdown":  descerFn(); break;
      case "arrowup":    rodarFn(1); break;
      case "space":      quedaFn(); break;
      case "keyp":       pausarFn(); break;
    }
  });

  // Botões visuais com repetição ao manter pressionado
  const repetirAoManter = (el, acao) => {
    let intervalo = null;
    const iniciar = () => {
      acao();
      intervalo = setInterval(acao, 150);
    };
    const parar = () => {
      clearInterval(intervalo);
    };

    el?.addEventListener("mousedown", iniciar);
    el?.addEventListener("mouseup", parar);
    el?.addEventListener("mouseleave", parar);
    el?.addEventListener("touchstart", iniciar, { passive: true });
    el?.addEventListener("touchend", parar);
  };

  repetirAoManter(document.getElementById("leftBtn"), () => moverFn(-1));
  repetirAoManter(document.getElementById("rightBtn"), () => moverFn(1));
  repetirAoManter(document.getElementById("downBtn"), () => descerFn());

  document.getElementById("rotateBtn")?.addEventListener("click", () => rodarFn(1));
  document.getElementById("dropBtn")?.addEventListener("click", () => quedaFn());

  // Gestos tácteis no canvas principal
  const canvas = document.getElementById("board");
  const overlay = document.getElementById("overlayQuedaRapida");

  let startX = 0, startY = 0, ultimoToque = 0;
  let toqueLongoTimer = null, quedaRapidaLoop = null;

  canvas?.addEventListener("touchstart", e => {
    if (e.touches.length > 1) return;

    const toque = e.touches[0];
    startX = toque.clientX;
    startY = toque.clientY;

    const agora = Date.now();
    if (agora - ultimoToque < 300) rodarFn(1); // duplo toque para rodar
    ultimoToque = agora;

    // Inicia queda rápida após 500ms de toque contínuo
    toqueLongoTimer = setTimeout(() => {
      quedaRapidaLoop = setInterval(() => {
        quedaFn();
        vibrar([20, 30, 20]);
        overlay?.classList.add("activo");
      }, 80);
    }, 500);
  }, { passive: true });

  canvas?.addEventListener("touchmove", e => {
    const toque = e.touches[0];
    const dx = toque.clientX - startX;
    const dy = toque.clientY - startY;

    // Cancela a queda rápida ao detectar movimento
    if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
      clearInterval(quedaRapidaLoop);
      overlay?.classList.remove("activo");
    }
  }, { passive: true });

  canvas?.addEventListener("touchend", e => {
    clearTimeout(toqueLongoTimer);
    clearInterval(quedaRapidaLoop);
    toqueLongoTimer = null;
    quedaRapidaLoop = null;
    overlay?.classList.remove("activo");

    if (e.changedTouches.length > 1) return;

    const toque = e.changedTouches[0];
    const dx = toque.clientX - startX;
    const dy = toque.clientY - startY;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const angulo = Math.atan2(dy, dx) * 180 / Math.PI;
    const limiar = 12;

    // Toque curto → rodar
    if (Math.max(absX, absY) < limiar && Date.now() - ultimoToque > 300) {
      rodarFn(1);
      ultimoToque = Date.now();
      return;
    }

    // Deslize lateral com tolerância angular alargada
    if (absX > 30 && (Math.abs(angulo) < 45 || Math.abs(angulo) > 135)) {
      dx > 0 ? moverFn(1) : moverFn(-1);
      return;
    }

    // Deslize vertical → queda ou descida
    if (absY > absX && dy > 60) {
      quedaFn();
    } else if (absY > absX) {
      descerFn();
    }
  }, { passive: true });

  // Alternador do modo táctil arcade
  const btnTatil = document.getElementById("alternarModoTatil");
  if (btnTatil) {
    const actualizarVisual = () => {
      btnTatil.textContent = "Modo Táctil: " + (modoArcadeTatil ? "Activo" : "Inactivo");
      btnTatil.classList.toggle("botao-tatil-activo", modoArcadeTatil);
      btnTatil.classList.toggle("botao-tatil-inactivo", !modoArcadeTatil);
    };
    btnTatil.addEventListener("click", () => {
      modoArcadeTatil = !modoArcadeTatil;
      actualizarVisual();
    });
    actualizarVisual();
  }
}
