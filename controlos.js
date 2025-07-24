import { verificarColisao, rodar } from "./motor.js";
import { tocarSomRodar } from "./audio.js";

// Estado do modo táctil arcade (com vibração opcional)
let modoArcadeTatil = true;

/**
 * Vibra o dispositivo caso o modo táctil esteja activo e seja suportado
 * @param {number|Array<number>} padrao - Duração ou sequência de vibração
 */
function vibrar(padrao) {
  if (!modoArcadeTatil || !navigator.vibrate) return;
  navigator.vibrate(padrao);
}

/**
 * Move a peça horizontalmente, se não houver colisão lateral
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
 * Roda a peça no sentido indicado, se possível
 * Aplica som e vibração se rotação for válida
 */
export function rodarPeca(direcao, peca, tabuleiro, posicao) {
  const rodada = rodar(peca, direcao);
  if (verificarColisao(tabuleiro, rodada, posicao)) {
    return peca;
  }
  tocarSomRodar();
  vibrar(30);
  return rodada;
}

/**
 * Faz a peça descer uma linha. Se travar, retorna verdadeiro
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
 * Liga todos os controlos do jogo:
 * - Teclado físico
 * - Botões visuais
 * - Gestos tácteis
 * - Alternador do modo táctil
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
      case "arrowleft":  moverFn(-1);  break;
      case "arrowright": moverFn(1);   break;
      case "arrowdown":  descerFn();   break;
      case "arrowup":    rodarFn(1);   break;
      case "space":      quedaFn();    break;
      case "keyp":       pausarFn();   break;
    }
  });

  /**
   * Liga um botão com ação repetida enquanto mantido pressionado
   */
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

  // Botões visuais principais
  repetirAoManter(document.getElementById("leftBtn"),  () => moverFn(-1));
  repetirAoManter(document.getElementById("rightBtn"), () => moverFn(1));
  repetirAoManter(document.getElementById("downBtn"),  () => descerFn());

  document.getElementById("rotateBtn")?.addEventListener("click", () => rodarFn(1));
  document.getElementById("dropBtn")?.addEventListener("click", () => quedaFn());

  // Gestos tácteis no canvas principal
  const canvas = document.getElementById("board");
  let startX = 0, startY = 0, ultimoToque = 0;

  canvas?.addEventListener("touchstart", e => {
    if (e.touches.length > 1) return;
    const toque = e.touches[0];
    startX = toque.clientX;
    startY = toque.clientY;

    const agora = Date.now();
    if (agora - ultimoToque < 300) rodarFn(1); // Duplo toque rápido
    ultimoToque = agora;
  }, { passive: true });

  canvas?.addEventListener("touchend", e => {
    if (e.changedTouches.length > 1) return;
    const toque = e.changedTouches[0];
    const dx = toque.clientX - startX;
    const dy = toque.clientY - startY;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const limiar = 12;

    if (Math.max(absX, absY) < limiar) {
      rodarFn(1);
      return;
    }

    if (absX > absY) {
      dx > 0 ? moverFn(1) : moverFn(-1);
    } else {
      dy > 60 ? quedaFn() : descerFn();
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
