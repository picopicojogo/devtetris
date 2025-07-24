// Importação dos módulos necessários
import {
  COLUNAS, LINHAS,
  criarMatriz, verificarColisao,
  fundirPeca, gerarPeca,
  limparLinhas
} from './motor.js';

import {
  configurarCanvas,
  desenharJogo, desenharProxima,
  atualizarTempo, mostrarModalFim
} from './canvas.js';

import {
  tocarSomColidir, tocarSomPerdeu,
  iniciarMusicaFundo, pararMusicaFundo,
  alternarMusica, alternarEfeitos
} from './audio.js';

import {
  moverPeca, rodarPeca, descerPeca,
  configurarControlos
} from './controlos.js';

import {
  processarLinhas,
  reiniciarPontuacao,
  guardarPontuacao,
  obterRankingOrdenado,
  injectarEstilosRankingPontuacao,
  nivel // Utilizado para velocidade e seleção de peças
} from './pontuacao.js';

import {
  partilharResultadoFinal,
  configurarPartilhasPerfil,
  configurarPartilhasPerfilFlexivel,
  configurarPartilhaClipboard,
  configurarPartilhaLinkCurto,
  configurarPartilhaEmailPerfil,
  configurarPartilhaImagemCartao
} from './partilhas.js';

import {
  gerarCartaoJogadorDados
} from './cartao.js';

// Inicialização de estilos e funcionalidades auxiliares
injectarEstilosRankingPontuacao();
configurarPartilhasPerfil();
configurarPartilhasPerfilFlexivel();
configurarPartilhaClipboard();
configurarPartilhaLinkCurto();
configurarPartilhaEmailPerfil();
configurarPartilhaImagemCartao();

// Configuração dos canvas principais
const { ctxBoard, ctxNext } = configurarCanvas();

// Estado inicial do jogo
let tabuleiro   = criarMatriz(COLUNAS, LINHAS);
let pecaAtual   = gerarPeca(nivel);
let proximaPeca = gerarPeca(nivel);
let posicao     = { x: Math.floor(COLUNAS / 2) - 1, y: 0 };

let intervalo      = null;
let tempoIntervalo = null;
let segundos       = 0;

/**
 * Atualiza o estado do jogo em cada ciclo
 */
function atualizar() {
  posicao.y++;

  if (verificarColisao(tabuleiro, pecaAtual, posicao)) {
    posicao.y--;
    fundirPeca(tabuleiro, pecaAtual, posicao);
    tocarSomColidir();

    const linhasFeitas = limparLinhas(tabuleiro);
    const { pontuacao } = processarLinhas(linhasFeitas);

    const canvasTabuleiro = document.querySelector("canvas#board");
    if (linhasFeitas > 1 && canvasTabuleiro) {
      canvasTabuleiro.classList.add("combo-ativo");
      setTimeout(() => canvasTabuleiro.classList.remove("combo-ativo"), 600);
    }

    [pecaAtual, proximaPeca] = [proximaPeca, gerarPeca(nivel)];
    posicao = { x: Math.floor(COLUNAS / 2) - 1, y: 0 };

    if (verificarColisao(tabuleiro, pecaAtual, posicao)) {
      tocarSomPerdeu();
      clearInterval(intervalo);
      clearInterval(tempoIntervalo);
      mostrarModalFim(pontuacao);
      return;
    }
  }

  desenhar();
}

/**
 * Atualiza o desenho dos canvas
 */
function desenhar() {
  desenharJogo(ctxBoard, ctxBoard.canvas.width, ctxBoard.canvas.height, tabuleiro, pecaAtual, posicao);
  desenharProxima(ctxNext, proximaPeca);
}

/**
 * Faz a peça descer instantaneamente até travar
 */
function quedaInstantanea() {
  while (!verificarColisao(tabuleiro, pecaAtual, { x: posicao.x, y: posicao.y + 1 })) {
    posicao.y++;
  }
  atualizar();
}

/**
 * Pausa o jogo
 */
function pausarJogo() {
  clearInterval(intervalo);
  clearInterval(tempoIntervalo);
  intervalo = null;
  tempoIntervalo = null;
  pararMusicaFundo();
}

/**
 * Inicia o cronómetro do jogo
 */
function iniciarTempo() {
  tempoIntervalo = setInterval(() => {
    segundos++;
    atualizarTempo(segundos);
  }, 1000);
}

/**
 * Mostra uma mensagem visual breve
 */
function mostrarMensagem(texto) {
  const msg = document.getElementById("mensagemConforto");
  if (!msg) return;
  msg.textContent = texto;
  msg.style.display = "block";
  msg.style.opacity = "1";
  setTimeout(() => {
    msg.style.opacity = "0";
    setTimeout(() => {
      msg.style.display = "none";
    }, 1000);
  }, 4000);
}

/**
 * Atualiza estatísticas no modal respetivo
 */
function atualizarEstatisticasModal() {
  const lista = document.getElementById("estatisticasList");
  if (!lista) return;

  const nome   = document.getElementById("player-name")?.value.trim() || "Jogador";
  const pontos = document.getElementById("score")?.textContent || "0";
  const nivelTxt  = document.getElementById("level")?.textContent || "1";
  const tempo  = document.getElementById("time")?.textContent || "--:--";

  const ranking = obterRankingOrdenado();
  const jogadorSalvo = ranking.find(j => j.nome === nome);
  const combos = jogadorSalvo?.combos || 0;
  const data   = jogadorSalvo?.data || new Date().toLocaleDateString("pt-PT");

  lista.innerHTML = `
    <li>👤 Nome: ${nome}</li>
    <li>💯 Pontos: ${pontos}</li>
    <li>🎮 Nível: ${nivelTxt}</li>
    <li>🔁 Combos: ${combos}</li>
    <li>⏱️ Tempo: ${tempo}</li>
    <li>📅 Data: ${data}</li>
  `;
}

/**
 * Aplica modo conforto automático com base na hora ou preferências guardadas
 */
function aplicarModoAutomatico() {
  const localPref = localStorage.getItem("modoConfortoAtivado");
  const hora = new Date().getHours();
  const estaNoite = hora >= 20 || hora <= 6;
  const ativar = (estaNoite && localPref !== "false") || localPref === "true";

  if (ativar) {
    document.body.classList.add("modo-seguro");
    if (estaNoite) {
      mostrarMensagem("🌙 O Pico-Pico activou automaticamente o modo conforto.");
    }
  }
}

/**
 * Ajusta elementos visuais conforme a resolução do dispositivo
 */
function adaptarLayoutPorResolucao() {
  const altura = window.innerHeight;
  const largura = window.innerWidth;

  const titulo = document.querySelector("h1");
  const preview = document.getElementById("preview-container");
  const canvasTabuleiro = document.querySelector("canvas#board");

  if (altura <= 550 && titulo && preview) {
    titulo.style.display = "none";
    preview.style.display = "none";
  }

  if (largura <= 480 && canvasTabuleiro) {
    canvasTabuleiro.style.maxHeight = "38vh";
  }
}

// Configuração dos controlos principais
configurarControlos(
  dir => moverPeca(dir, tabuleiro, pecaAtual, posicao),
  sentido => {
    const nova = rodarPeca(sentido, pecaAtual, tabuleiro, posicao);
    if (nova !== pecaAtual) {
      pecaAtual = nova;
      desenhar();
    }
  },
  () => {
    const travou = descerPeca(tabuleiro, pecaAtual, posicao);
    travou ? atualizar() : desenhar();
  },
  quedaInstantanea,
  pausarJogo
);

// Referência aos botões da interface
const btns = {
  start: document.getElementById("startBtn"),
  pause: document.getElementById("pauseBtn"),
  reset: document.getElementById("resetBtn"),
  toggleSound: document.getElementById("toggle-sound"),
  confirmSave: document.getElementById("confirmSave"),
  cancelSave: document.getElementById("cancelSave"),
  top10: document.getElementById("top10Btn"),
  fecharTop10: document.getElementById("fecharTop10"),
  estatisticas: document.getElementById("estatisticasBtn"),
  fecharEstatisticas: document.getElementById("fecharEstatisticas"),
  partilhar: document.getElementById("partilharResultado"),
  cartao: document.getElementById("gerarCartaoJogador"),
    modoSeguro: document.getElementById("modoSeguroBtn"),
  resetPrefs: document.getElementById("resetPreferenciasBtn"),
  alternarEfeitos: document.getElementById("alternarEfeitosBtn")
};

// Ação ao iniciar o jogo — velocidade ajustada ao nível
if (btns.start) {
  btns.start.addEventListener("click", () => {
    if (!intervalo) {
      const velocidade = Math.max(80, 600 - (nivel * 20));
      intervalo = setInterval(atualizar, velocidade);
      iniciarTempo();
      iniciarMusicaFundo();
    }
  });
}

// Pausa do jogo
if (btns.pause) {
  btns.pause.addEventListener("click", pausarJogo);
}

// Reinício total do jogo
if (btns.reset) {
  btns.reset.addEventListener("click", () => {
    pausarJogo();
    tabuleiro = criarMatriz(COLUNAS, LINHAS);
    [pecaAtual, proximaPeca] = [gerarPeca(nivel), gerarPeca(nivel)];
    posicao = { x: Math.floor(COLUNAS / 2) - 1, y: 0 };
    segundos = 0;
    reiniciarPontuacao();
    atualizarTempo(segundos);
    desenhar();
  });
}

// Alternar música de fundo
if (btns.toggleSound) {
  btns.toggleSound.addEventListener("click", alternarMusica);
}

// Guardar pontuação
if (btns.confirmSave) {
  btns.confirmSave.addEventListener("click", () => {
    const pontos = parseInt(document.getElementById("score")?.textContent || "0", 10);
    guardarPontuacao(pontos);
  });
}

// Cancelar modal de guardar
if (btns.cancelSave) {
  btns.cancelSave.addEventListener("click", () => {
    const modal = document.getElementById("modal");
    if (modal) modal.classList.remove("show");
  });
}

// Mostrar ranking Top 10
if (btns.top10) {
  btns.top10.addEventListener("click", () => {
    const modal = document.getElementById("top10Modal");
    const lista = document.getElementById("top10List");
    const ranking = obterRankingOrdenado();
    const nomeAtual = document.getElementById("player-name")?.value.trim();

    if (lista) {
      lista.innerHTML = ranking.map((jogador, i) => {
        const medalhaClass  = `medalha-${jogador.medalha}`;
        const destaqueClass = `destaque-${jogador.destaque}`;
        const ehAtual       = nomeAtual && nomeAtual === jogador.nome;
        const classeExtra   = ehAtual ? "jogador-actual" : "";

        return `<li class="${medalhaClass} ${destaqueClass} ${classeExtra}" title="🌟 ${jogador.data}">
          ${i + 1}. ${jogador.nome} — ${jogador.pontos} pts
        </li>`;
      }).join("");
    }

    if (modal) modal.classList.add("show");
  });
}

// Fechar modal Top 10
if (btns.fecharTop10) {
  btns.fecharTop10.addEventListener("click", () => {
    const modal = document.getElementById("top10Modal");
    if (modal) modal.classList.remove("show");
  });
}

// Mostrar estatísticas
if (btns.estatisticas) {
  btns.estatisticas.addEventListener("click", () => {
    atualizarEstatisticasModal();
    const modal = document.getElementById("estatisticasModal");
    if (modal) modal.classList.add("show");
  });
}

// Fechar estatísticas
if (btns.fecharEstatisticas) {
  btns.fecharEstatisticas.addEventListener("click", () => {
    const modal = document.getElementById("estatisticasModal");
    if (modal) modal.classList.remove("show");
  });
}

// Partilhar resultado final
if (btns.partilhar) {
  btns.partilhar.addEventListener("click", partilharResultadoFinal);
}

// Gerar cartão do jogador
if (btns.cartao) {
  btns.cartao.addEventListener("click", () => {
    const nome   = document.getElementById("player-name")?.value.trim() || "Jogador Anónimo";
    const pontos = parseInt(document.getElementById("score")?.textContent || "0", 10);
    const nivelAtual  = parseInt(document.getElementById("level")?.textContent || "1", 10);
    const tempo  = document.getElementById("time")?.textContent || "00:00";
    const ranking = obterRankingOrdenado();
    const jogadorSalvo = ranking.find(j => j.nome === nome);
    const combos = jogadorSalvo?.combos || 0;

    const agora = new Date();
    const data = agora.toLocaleDateString("pt-PT", {
      day: "2-digit", month: "2-digit", year: "numeric"
    });

    const jogador = { nome, pontos, nivel: nivelAtual, data, combos, tempo };
    gerarCartaoJogadorDados(jogador);
  });
}

// Alternar manualmente o modo conforto
if (btns.modoSeguro) {
  btns.modoSeguro.addEventListener("click", () => {
    const corpo = document.body;
    const ativar = !corpo.classList.contains("modo-seguro");
    corpo.classList.toggle("modo-seguro");
    localStorage.setItem("modoConfortoAtivado", ativar ? "true" : "false");

    mostrarMensagem(ativar
      ? "Modo conforto activado."
      : "Modo conforto desactivado.");
  });
}

// Reiniciar preferências e ranking
if (btns.resetPrefs) {
  btns.resetPrefs.addEventListener("click", () => {
    if (confirm("Queres mesmo apagar todas as pontuações e definições guardadas?")) {
      ["modoConfortoAtivado", "rankingTop10", "jogadorRecente"].forEach(chave => {
        localStorage.removeItem(chave);
      });
      document.body.classList.remove("modo-seguro");
      mostrarMensagem("Preferências apagadas.");
      setTimeout(() => location.reload(), 4000);
    }
  });
}

// Alternar efeitos sonoros
if (btns.alternarEfeitos) {
  btns.alternarEfeitos.addEventListener("click", () => {
    const silenciado = btns.alternarEfeitos.classList.contains("silenciado");

    alternarEfeitos();
    btns.alternarEfeitos.classList.toggle("silenciado");
    btns.alternarEfeitos.textContent = silenciado
      ? "🔔 Efeitos Activos"
      : "🔕 Efeitos Silenciados";

    mostrarMensagem(silenciado
      ? "Efeitos sonoros activados."
      : "Efeitos sonoros silenciados.");
  });
}

// Inicialização visual ao carregar a página
atualizarTempo(segundos);
aplicarModoAutomatico();
adaptarLayoutPorResolucao();
desenhar();
