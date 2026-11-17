// Quiz Recology

const perguntas = [
    {
        texto: "Qual atitude economiza mais água?",
        opcoes: ["Banho de 15 minutos", "Banho de 5 minutos", "Deixar a torneira aberta ao escovar os dentes"],
        correta: 1,
        explicacao: "Banhos curtos reduzem muito o consumo de água e de energia do chuveiro."
    },
    {
        texto: "O que fazer com aparelhos que ficam em modo de espera?",
        opcoes: ["Nada, eles não gastam energia", "Deixar sempre ligados", "Desligar da tomada quando não estiver usando"],
        correta: 2,
        explicacao: "Mesmo em espera, muitos aparelhos continuam consumindo energia."
    },
    {
        texto: "Qual lâmpada costuma gastar menos energia?",
        opcoes: ["Incandescente", "LED", "Halógena"],
        correta: 1,
        explicacao: "As lâmpadas de LED gastam menos energia e duram mais."
    },
    {
        texto: "Qual é a melhor forma de evitar o desperdício de alimentos?",
        opcoes: ["Comprar muito para nunca faltar", "Planejar as compras e as refeições", "Jogar fora o que sobrar"],
        correta: 1,
        explicacao: "Planejar evita comprar demais e reduz o que estraga."
    },
    {
        texto: "Quais são os 3 R's da sustentabilidade?",
        opcoes: ["Reduzir, Reutilizar e Reciclar", "Reparar, Recusar e Reclamar", "Reformar, Reter e Reciclar"],
        correta: 0,
        explicacao: "Reduzir, reutilizar e reciclar, nessa ordem de prioridade."
    },
    {
        texto: "Em qual lixeira devemos descartar uma garrafa PET limpa?",
        opcoes: ["Reciclável", "Orgânico", "Qualquer uma"],
        correta: 0,
        explicacao: "O plástico limpo e seco deve ir para a coleta seletiva."
    },
    {
        texto: "O que fazer ao notar uma torneira pingando?",
        opcoes: ["Ignorar, é pouca água", "Consertar o quanto antes", "Esperar piorar"],
        correta: 1,
        explicacao: "Pequenos vazamentos somam muitos litros desperdiçados ao longo do dia."
    },
    {
        texto: "Qual hábito ajuda a reduzir o lixo descartável?",
        opcoes: ["Usar sacola e garrafa reutilizáveis", "Usar copos de plástico", "Pedir várias sacolas no mercado"],
        correta: 0,
        explicacao: "Itens reutilizáveis evitam a produção constante de lixo."
    }
];

let atual = 0;
let pontos = 0;
let respondeu = false;

const elContador = document.getElementById("contador");
const elBarra = document.getElementById("barraQuiz");
const elPergunta = document.getElementById("pergunta");
const elOpcoes = document.getElementById("opcoes");
const elFeedback = document.getElementById("feedback");
const btnProxima = document.getElementById("btnProxima");
const quizBox = document.getElementById("quizBox");

function mostrarPergunta() {
    const p = perguntas[atual];
    respondeu = false;

    elContador.textContent = "Pergunta " + (atual + 1) + " de " + perguntas.length;
    elBarra.style.width = (atual / perguntas.length) * 100 + "%";
    elPergunta.textContent = p.texto;
    elOpcoes.innerHTML = "";
    elFeedback.classList.add("d-none");
    btnProxima.classList.add("d-none");

    p.opcoes.forEach(function (opcao, i) {
        const botao = document.createElement("button");
        botao.className = "btn btn-outline-success opcao";
        botao.textContent = opcao;
        botao.addEventListener("click", function () {
            responder(i);
        });
        elOpcoes.appendChild(botao);
    });
}

function responder(escolhida) {
    if (respondeu) return;
    respondeu = true;

    const p = perguntas[atual];
    const botoes = elOpcoes.querySelectorAll("button");

    botoes.forEach(function (botao, i) {
        botao.disabled = true;
        if (i === p.correta) botao.classList.add("certa");
    });

    if (escolhida === p.correta) {
        pontos++;
        elFeedback.textContent = "✅ Correto! " + p.explicacao;
    } else {
        botoes[escolhida].classList.add("errada");
        elFeedback.textContent = "❌ Quase! " + p.explicacao;
    }

    elFeedback.classList.remove("d-none");
    btnProxima.textContent = atual === perguntas.length - 1 ? "Ver resultado" : "Próxima";
    btnProxima.classList.remove("d-none");
}

function mostrarResultado() {
    let mensagem;
    const proporcao = pontos / perguntas.length;

    if (proporcao === 1) {
        mensagem = "Incrível! Você é um verdadeiro guardião do planeta! 🌍";
    } else if (proporcao >= 0.6) {
        mensagem = "Muito bem! Você já tem ótimos hábitos. 🌱";
    } else {
        mensagem = "Bom começo! Dê uma olhada nas dicas e tente de novo. 💧";
    }

    quizBox.innerHTML =
        '<div class="resultado">' +
        '<p class="contagem">Resultado final</p>' +
        '<div class="nota">' + pontos + " / " + perguntas.length + "</div>" +
        "<p class='my-3'>" + mensagem + "</p>" +
        '<button class="btn btn-success me-2" id="btnRecomecar">Refazer quiz</button>' +
        '<a href="dicas.html" class="btn btn-outline-success">Ver dicas</a>' +
        "</div>";

    document.getElementById("btnRecomecar").addEventListener("click", function () {
        location.reload();
    });
}

btnProxima.addEventListener("click", function () {
    atual++;
    if (atual < perguntas.length) {
        mostrarPergunta();
    } else {
        mostrarResultado();
    }
});

mostrarPergunta();