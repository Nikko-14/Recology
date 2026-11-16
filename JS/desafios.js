// Desafios: salva o progresso no navegador (localStorage)

const CHAVE = "recology_desafios";
const checks = document.querySelectorAll(".check");
const barra = document.getElementById("barraProgresso");
const texto = document.getElementById("textoProgresso");
const mensagem = document.getElementById("mensagemProgresso");
const btnReiniciar = document.getElementById("btnReiniciar");

function carregar() {
    try {
        return JSON.parse(localStorage.getItem(CHAVE)) || {};
    } catch (e) {
        return {};
    }
}

function salvar(dados) {
    try {
        localStorage.setItem(CHAVE, JSON.stringify(dados));
    } catch (e) {
        // se o navegador bloquear o armazenamento, o progresso vale só nesta visita
    }
}

function atualizar() {
    const total = checks.length;
    let feitos = 0;

    checks.forEach(function (check) {
        const card = check.closest(".card-desafio");
        card.classList.toggle("feito", check.checked);
        if (check.checked) feitos++;
    });

    const porcentagem = Math.round((feitos / total) * 100);
    barra.style.width = porcentagem + "%";
    barra.textContent = porcentagem + "%";
    texto.textContent = feitos + " de " + total;

    if (feitos === total) {
        mensagem.textContent = "🎉 Parabéns! Você concluiu todos os desafios!";
    } else if (feitos > 0) {
        mensagem.textContent = "Muito bem! Continue, falta pouco.";
    } else {
        mensagem.textContent = "Cada escolha faz diferença para o futuro do planeta.";
    }
}

// restaura o que foi marcado antes
const salvos = carregar();
checks.forEach(function (check) {
    check.checked = !!salvos[check.dataset.id];

    check.addEventListener("change", function () {
        const dados = carregar();
        dados[check.dataset.id] = check.checked;
        salvar(dados);
        atualizar();
    });
});

btnReiniciar.addEventListener("click", function () {
    checks.forEach(function (check) {
        check.checked = false;
    });
    salvar({});
    atualizar();
});

atualizar();