// Estado interno do jogo
let pontuacao   = 0;
let nivel       = 1;
let comboAtivo  = false;
let totalCombos = 0;

/**
 * Processa as linhas eliminadas e atualiza pontuação, nível e combos.
 */
export function processarLinhas(linhasFeitas) {
  let pontosGanhos = 0;

  if (linhasFeitas >= 1) {
    pontosGanhos = linhasFeitas * 100;

    // Frases de celebração por número de linhas (PT-PT)
    const celebracoes = {
      1: [
        "Linha limpa! 🧼",
        "Está a começar a festa! 🎉",
        "Uma riscada com estilo! ✏️",
        "Brinco de jogada. 💎"
      ],
      2: [
        "Dupla eliminada! 🔥",
        "Combo suave. Mantém! 🌀",
        "Corte eficaz! ✂️",
        "Fortaleza a crescer! 🧱"
      ],
      3: [
        "Trinca brutal! ⚡",
        "Triple kill arcade! 💣",
        "Jogada táctica! 🎯",
        "Bricks em queda livre! 🛬"
      ],
      4: [
        "Tetris lendário! 👑🧱",
        "Quatro num golpe só! ⚔️",
        "Combo galáctico! 🌌",
        "Mestre dos Bricks! 🕹️"
      ]
    };

    const frases = celebracoes[linhasFeitas] || ["Boa jogada! 🎮"];
    const textoCelebracao = frases[Math.floor(Math.random() * frases.length)];
    mostrarCelebracao(textoCelebracao);

    if (comboAtivo) totalCombos++;
    comboAtivo = true;

    pontuacao += pontosGanhos;
    pontuacao = Math.min(pontuacao, 999999); // 🔒 Limite máximo
    nivel = 1 + Math.floor(pontuacao / 500);
    atualizarPontuacao(pontuacao, nivel);
  } else {
    comboAtivo = false;
  }

  return { pontuacao, nivel, combos: totalCombos };
}

/**
 * Reinicia a pontuação e o estado geral do jogo.
 */
export function reiniciarPontuacao() {
  pontuacao   = 0;
  nivel       = 1;
  comboAtivo  = false;
  totalCombos = 0;
  atualizarPontuacao(pontuacao, nivel);
}

/**
 * Atualiza os elementos visuais de pontuação e nível no ecrã.
 */
function atualizarPontuacao(pontos, nivelAtual) {
  const elPontos = document.getElementById("score");
  const elNivel  = document.getElementById("level");
  if (elPontos) elPontos.textContent = pontos;
  if (elNivel)  elNivel.textContent  = nivelAtual;
}

/**
 * Mostra mensagem breve de celebração após jogada especial.
 */
function mostrarCelebracao(texto) {
  const el = document.getElementById("celebracao");
  if (!el) return;

  el.textContent = texto;
  el.style.opacity = "1";
  el.style.transform = "scale(1.1)";
  el.style.transition = "opacity 0.4s ease, transform 0.3s ease";

  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "scale(1)";
  }, 1200);
}

/**
 * Guarda os dados do jogador e atualiza o ranking local.
 */
export function guardarPontuacao(pontuacaoFinal) {
  const input = document.getElementById("player-name");
  const nome  = input?.value.trim();
  if (!nome) {
    alert("Por favor, escreve o teu nome para guardar a pontuação.");
    return;
  }

  const agora = new Date();
  const data = agora.toLocaleDateString("pt-PT", {
    day: "2-digit", month: "2-digit", year: "numeric"
  });

  const tempo = document.getElementById("time")?.textContent || "--:--";

  const novoJogador = {
    nome,
    pontos: pontuacaoFinal,
    nivel,
    tempo,
    combos: totalCombos,
    data
  };

  const ranking = JSON.parse(localStorage.getItem("rankingTop10") || "[]");
  ranking.push(novoJogador);
  ranking.sort((a, b) => b.pontos - a.pontos);
  ranking.splice(10);

  localStorage.setItem("rankingTop10", JSON.stringify(ranking));
  document.getElementById("modal")?.classList.remove("show");

  mostrarMensagem("Resultado guardado com sucesso.");
}

/**
 * Retorna o ranking Top 10 com categorias de mérito visuais.
 */
export function obterRankingOrdenado() {
  const lista = JSON.parse(localStorage.getItem("rankingTop10") || "[]");

  return lista
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, 10)
    .map(jogador => {
      const medalha =
        jogador.pontos >= 3000 ? "ouro" :
        jogador.pontos >= 2000 ? "prata" :
        jogador.pontos >= 1000 ? "bronze" :
        "participacao";

      const destaque =
        jogador.combos >= 12 ? "estratega" :
        jogador.combos >= 6  ? "rapido" :
        jogador.tempo <= "01:00" ? "relampago" :
        "resistente";

      return { ...jogador, medalha, destaque };
    });
}

/**
 * Mostra uma mensagem informativa temporária no fundo do ecrã.
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
  }, 3000);
}

/**
 * Injeta estilos retro visuais para medalhas e destaque no ranking.
 */
export function injectarEstilosRankingPontuacao() {
  if (document.getElementById("estilos-ranking-pontuacao")) return;

  const estilos = document.createElement("style");
  estilos.id = "estilos-ranking-pontuacao";
  estilos.textContent = `
    .medalha-ouro       { color: #FFD700; font-weight: bold; text-shadow: 0 0 4px #FFF176; }
    .medalha-prata      { color: #C0C0C0; font-weight: bold; text-shadow: 0 0 3px #CFD8DC; }
    .medalha-bronze     { color: #CD7F32; font-weight: bold; text-shadow: 0 0 3px #D7CCC8; }
    .medalha-participacao { color: #999; opacity: 0.8; }

    .destaque-estratega  { background-color: #1c1c3c; border-left: 4px solid #00ffff; }
    .destaque-rapido     { background-color: #1c3c1c; border-left: 4px solid #00ff99; }
    .destaque-relampago  { background-color: #3c1c1c; border-left: 4px solid #ff4444; }
    .destaque-resistente { background-color: #2a2a2a; border-left: 4px solid #cccccc; }

    ul#top10List li {
      padding: 0.4em;
      margin-bottom: 0.3em;
      border-radius: 6px;
      transition: background-color 0.2s ease;
    }
    ul#top10List li:hover {
      background-color: rgba(255,255,255,0.05);
    }
  `;
  document.head.appendChild(estilos);
}
