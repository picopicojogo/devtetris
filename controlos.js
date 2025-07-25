import { verificarColisao, rodar } from "./motor.js";
import { tocarSomRodar } from "./audio.js";

// Estado actual do modo táctil arcade (activado ou não)
let modoArcadeTatil = true;

/**
 * Vibra o dispositivo, caso o modo esteja activo e suportado
 * @param {number|Array<number>} padrao - duração ou sequência da vibração
 */
function vibrar(padrao) {
  if (!modoArcadeTatil || !navigator.vibrate) return;
  navigator.vibrate(padrao);
}

/**
 * Move a peça lateralmente, se não houver colisão
 * @param {number} direcao -1 para a esquerda, +1 para a direita
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
 * Roda a peça na direcção indicada, se possível
 * Produz som e vibração caso a rotação seja válida
 */
export function rodarPeca(direcao, peca, tabuleiro, posicao) {
  const rodada = rodar(peca, direcao);
  if (verificarColisao(tabuleiro, rodada, posicao)) return peca;
  tocarSomRodar();
  vibrar(30);
  return rodada;
}

/**
 * Tenta fazer a peça descer uma linha
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
 * Configura todos os controlos:
 * - Teclado físico
 * - Botões visuais com repetição
 * - Gestos tácteis no canvas
 * - Alternador do modo táctil arcade
 */
export function configurarControlos(moverFn, rodarFn, descerFn, quedaFn, pausarFn) {
  // Teclado físico
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
      intervalo = null;
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
    if (agora - ultimoToque < 300) rodarFn(1); // duplo toque
    ultimoToque = agora;

    // Inicia descida rápida após 500ms de toque contínuo
    toqueLongoTimer = setTimeout(() => {
      quedaRapidaLoop = setInterval(() => {
        quedaFn();
        vibrar([20, 30, 20]);
        overlay?.classList.add("activo");
      }, 80);
    }, 500);
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
    if (Math.max(absX, absY) < limiar) {
      rodarFn(1);
      return;
    }

    // Deslize lateral com precisão angular
    if (absX > 30 && Math.abs(angulo) < 30) {
      dx > 0 ? moverFn(1) : moverFn(-1);
      return;
    }

    // ⬇️ Deslize vertical → queda ou descida
    if (absY > absX && dy > 60) {
      quedaFn();
    } else if (absY > absX) {
      descerFn();
    }
  }, { passive: true });

  //  Alternador do modo táctil arcade
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
