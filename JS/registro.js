/*
 * registro.js — Diário de desperdício do Recology
 *
 * Faz as quatro operações sobre os dados (adicionar, listar, editar e remover)
 * atualizando a página pelo DOM, e mantém o painel de atividades.
 *
 * Segurança (resumo):
 *  - toda entrada é validada antes de ser usada (vazio, tamanho, formato e tipo);
 *  - o texto do usuário só entra na página com textContent, nunca com innerHTML (evita XSS);
 *  - os dados lidos do localStorage também são validados (alguém pode ter alterado);
 *  - mensagens de erro mostradas ao usuário são genéricas, sem detalhes técnicos.
 */

/* ============================
   CONSTANTES
   ============================ */

const CHAVE_DADOS = "recology_registros"; // nome usado no localStorage
const MAX_LOG = 50;                        // quantidade máxima de linhas no painel
const MAX_QUANTIDADE = 10000;
const DATA_MINIMA = "2020-01-01";

const MSG_ERRO_CARGA = "Não foi possível carregar os dados. Tente novamente.";
const MSG_ERRO_SALVAR = "Não foi possível salvar os dados. Tente novamente.";

// Tipos aceitos e a unidade de cada um
const TIPOS = {
    agua: { nome: "Água", unidade: "litros", emoji: "💧" },
    energia: { nome: "Energia", unidade: "kWh", emoji: "💡" },
    alimento: { nome: "Alimento", unidade: "kg", emoji: "🍎" }
};

// Locais aceitos
const LOCAIS = {
    casa: "Casa",
    comunidade: "Comunidade",
    negocio: "Pequeno negócio"
};

// Campos do formulário (mesmo nome do id no HTML)
const CAMPOS = ["tipo", "local", "descricao", "quantidade", "data"];

// Letras, números, espaço e pontuação simples
const PADRAO_TEXTO = /^[\p{L}\p{N} .,;:!?()%\/-]+$/u;

/* ============================
   ESTADO E ELEMENTOS DA PÁGINA
   ============================ */

let registros = [];       // lista de itens guardados
let idEmEdicao = null;    // id do item que está sendo editado (null = modo "adicionar")
let atividades = [];      // linhas do painel de atividades

const form = document.getElementById("formRegistro");
const btnSalvar = document.getElementById("btnSalvar");
const btnCancelar = document.getElementById("btnCancelar");
const elAlerta = document.getElementById("alerta");
const elLista = document.getElementById("listaRegistros");
const elTotais = document.getElementById("totais");
const elLog = document.getElementById("painelLog");

/* ============================
   FUNÇÕES DE DATA
   ============================ */

/** Devolve a data de hoje no formato AAAA-MM-DD (fuso do usuário). */
function dataDeHoje() {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + mes + "-" + dia;
}

/** Converte AAAA-MM-DD em DD/MM/AAAA. */
function formatarData(iso) {
    const partes = String(iso).split("-");
    return partes[2] + "/" + partes[1] + "/" + partes[0];
}

/** Devolve "DD/MM/AAAA HH:MM" do momento atual, para o painel de atividades. */
function agoraFormatado() {
    const d = new Date();
    const hora = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return formatarData(dataDeHoje()) + " " + hora + ":" + min;
}

/** Confere se um texto AAAA-MM-DD é uma data real (ex.: recusa 2026-02-31). */
function dataEhReal(texto) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
    const d = new Date(texto + "T00:00:00");
    if (Number.isNaN(d.getTime())) return false;
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + mes + "-" + dia === texto;
}

/* ============================
   VALIDAÇÃO (função pura: recebe dados, devolve erros)
   ============================ */

/**
 * Valida um registro. Devolve um objeto { campo: "mensagem" }.
 * Objeto vazio = tudo certo.
 */
function validarRegistro(dados) {
    const erros = {};
    const tem = (obj, chave) => Object.prototype.hasOwnProperty.call(obj, chave);

    // Tipo: precisa ser um dos valores conhecidos
    if (!tem(TIPOS, String(dados.tipo))) {
        erros.tipo = "Escolha o tipo de recurso.";
    }

    // Local: precisa ser um dos valores conhecidos
    if (!tem(LOCAIS, String(dados.local))) {
        erros.local = "Escolha onde aconteceu.";
    }

    // Descrição: tamanho, caracteres permitidos e ausência de dados pessoais
    const descricao = String(dados.descricao ?? "").trim();
    const digitos = descricao.replace(/\D/g, "").length;
    if (descricao === "") {
        erros.descricao = "Descreva o que foi desperdiçado.";
    } else if (descricao.length < 5) {
        erros.descricao = "Use pelo menos 5 caracteres.";
    } else if (descricao.length > 120) {
        erros.descricao = "Use no máximo 120 caracteres.";
    } else if (!PADRAO_TEXTO.test(descricao)) {
        erros.descricao = "Use apenas letras, números e pontuação simples.";
    } else if (descricao.includes("@") || digitos >= 8) {
        erros.descricao = "Não escreva e-mail, telefone ou outros dados pessoais.";
    }

    // Quantidade: número, maior que zero, limite máximo e até 2 casas decimais
    const textoQtd = String(dados.quantidade ?? "").trim();
    const qtd = Number(textoQtd);
    if (textoQtd === "") {
        erros.quantidade = "Informe a quantidade.";
    } else if (!Number.isFinite(qtd)) {
        erros.quantidade = "Digite um número válido.";
    } else if (qtd <= 0) {
        erros.quantidade = "A quantidade deve ser maior que zero.";
    } else if (qtd > MAX_QUANTIDADE) {
        erros.quantidade = "A quantidade máxima é 10.000.";
    } else if (Math.round(qtd * 100) / 100 !== qtd) {
        erros.quantidade = "Use no máximo 2 casas decimais.";
    }

    // Data: formato, existência, intervalo permitido
    const data = String(dados.data ?? "");
    if (data === "") {
        erros.data = "Informe a data.";
    } else if (!dataEhReal(data)) {
        erros.data = "Informe uma data válida.";
    } else if (data < DATA_MINIMA) {
        erros.data = "Informe uma data a partir de 2020.";
    } else if (data > dataDeHoje()) {
        erros.data = "A data não pode estar no futuro.";
    }

    return erros;
}

/** Lê os valores digitados no formulário. */
function lerFormulario() {
    const dados = {};
    CAMPOS.forEach(function (nome) {
        dados[nome] = document.getElementById(nome).value;
    });
    return dados;
}

/**
 * Junta as regras do JavaScript com as regras nativas do HTML5
 * (required, min, max...), usando checkValidity().
 */
function coletarErros(dados) {
    const erros = validarRegistro(dados);
    CAMPOS.forEach(function (nome) {
        const campo = document.getElementById(nome);
        if (!erros[nome] && !campo.checkValidity()) {
            erros[nome] = campo.validationMessage || "Valor inválido.";
        }
    });
    return erros;
}

/* ============================
   MENSAGENS NA TELA
   ============================ */

/** Mostra a mensagem de erro (ou limpa) de um campo. */
function mostrarErroDoCampo(nome, mensagem) {
    const campo = document.getElementById(nome);
    const aviso = document.getElementById("erro-" + nome);
    if (mensagem) {
        campo.classList.add("is-invalid");
        aviso.textContent = mensagem;
    } else {
        campo.classList.remove("is-invalid");
        aviso.textContent = "";
    }
}

/** Atualiza as mensagens de todos os campos. */
function mostrarErros(erros) {
    CAMPOS.forEach(function (nome) {
        mostrarErroDoCampo(nome, erros[nome]);
    });
}

/** Mostra um aviso geral no topo (tipo: "success" ou "danger"). */
function mostrarAlerta(texto, tipo) {
    elAlerta.className = "alert alert-" + tipo;
    elAlerta.textContent = texto;
}

function esconderAlerta() {
    elAlerta.className = "alert d-none";
    elAlerta.textContent = "";
}

/* ============================
   PAINEL DE ATIVIDADES
   ============================ */

/** Registra uma ação no painel: data/hora, ação e resultado. */
function registrarAtividade(acao, resultado, sucesso) {
    atividades.unshift({
        quando: agoraFormatado(),
        acao: acao,
        resultado: resultado,
        ok: sucesso !== false
    });
    if (atividades.length > MAX_LOG) atividades.pop();
    desenharAtividades();
}

function desenharAtividades() {
    elLog.replaceChildren();

    if (atividades.length === 0) {
        const vazio = document.createElement("li");
        vazio.className = "log-vazio";
        vazio.textContent = "Nenhuma atividade ainda.";
        elLog.appendChild(vazio);
        return;
    }

    atividades.forEach(function (item) {
        const li = document.createElement("li");
        li.className = "log-item " + (item.ok ? "log-ok" : "log-erro");

        const quando = document.createElement("time");
        quando.textContent = item.quando;

        const acao = document.createElement("strong");
        acao.textContent = item.acao;

        const resultado = document.createElement("span");
        resultado.textContent = item.resultado;

        li.append(quando, acao, resultado);
        elLog.appendChild(li);
    });
}

/* ============================
   ARMAZENAMENTO (localStorage)
   ============================ */

/** Grava a lista. Se falhar, lança erro (quem chamou trata). */
function salvarDados(lista) {
    localStorage.setItem(CHAVE_DADOS, JSON.stringify(lista));
}

/** Lê a lista gravada, descartando itens inválidos. */
function carregarDados() {
    const bruto = localStorage.getItem(CHAVE_DADOS);
    if (bruto === null) return [];

    const lista = JSON.parse(bruto);
    if (!Array.isArray(lista)) throw new Error("formato inesperado");

    return lista.filter(function (item) {
        return item !== null
            && typeof item === "object"
            && typeof item.id === "string"
            && /^[\w-]{1,40}$/.test(item.id)
            && Object.keys(validarRegistro(item)).length === 0;
    }).map(function (item) {
        // Reconstrói o objeto só com os campos esperados
        return {
            id: item.id,
            tipo: item.tipo,
            local: item.local,
            descricao: String(item.descricao).trim(),
            quantidade: Number(item.quantidade),
            data: item.data
        };
    });
}

function gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ============================
   OPERAÇÕES: ADICIONAR, LISTAR, EDITAR, REMOVER
   ============================ */

/** ADICIONAR */
function adicionarRegistro(dados) {
    try {
        const novo = {
            id: gerarId(),
            tipo: dados.tipo,
            local: dados.local,
            descricao: dados.descricao.trim(),
            quantidade: Number(dados.quantidade),
            data: dados.data
        };
        const novaLista = registros.concat(novo);

        salvarDados(novaLista);
        registros = novaLista;

        listarRegistros();
        limparFormulario();
        mostrarAlerta("Registro adicionado com sucesso.", "success");
        registrarAtividade("Adicionar", "Registro adicionado com sucesso");
    } catch (erro) {
        console.error(erro);
        mostrarAlerta(MSG_ERRO_SALVAR, "danger");
        registrarAtividade("Adicionar", "Falha ao adicionar o registro", false);
    }
}

/** EDITAR (passo 1): leva os dados do item para o formulário */
function iniciarEdicao(id) {
    const item = registros.find(function (r) { return r.id === id; });
    if (!item) return;

    CAMPOS.forEach(function (nome) {
        document.getElementById(nome).value = item[nome];
    });
    atualizarUnidade();
    mostrarErros({});
    esconderAlerta();

    idEmEdicao = id;
    btnSalvar.textContent = "Salvar alterações";
    btnCancelar.classList.remove("d-none");

    form.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("descricao").focus();
}

/** EDITAR (passo 2): grava as alterações */
function salvarEdicao(dados) {
    try {
        const novaLista = registros.map(function (r) {
            if (r.id !== idEmEdicao) return r;
            return {
                id: r.id,
                tipo: dados.tipo,
                local: dados.local,
                descricao: dados.descricao.trim(),
                quantidade: Number(dados.quantidade),
                data: dados.data
            };
        });

        salvarDados(novaLista);
        registros = novaLista;

        listarRegistros();
        limparFormulario();
        mostrarAlerta("Registro atualizado com sucesso.", "success");
        registrarAtividade("Editar", "Registro atualizado com sucesso");
    } catch (erro) {
        console.error(erro);
        mostrarAlerta(MSG_ERRO_SALVAR, "danger");
        registrarAtividade("Editar", "Falha ao atualizar o registro", false);
    }
}

function cancelarEdicao() {
    limparFormulario();
    esconderAlerta();
    registrarAtividade("Editar", "Edição cancelada");
}

/** REMOVER */
function removerRegistro(id) {
    if (!window.confirm("Deseja remover este registro?")) {
        registrarAtividade("Remover", "Remoção cancelada");
        return;
    }

    try {
        const novaLista = registros.filter(function (r) { return r.id !== id; });

        salvarDados(novaLista);
        registros = novaLista;

        // Se estava editando justamente este item, sai do modo edição
        if (idEmEdicao === id) limparFormulario();

        listarRegistros();
        mostrarAlerta("Registro removido com sucesso.", "success");
        registrarAtividade("Remover", "Registro removido com sucesso");
    } catch (erro) {
        console.error(erro);
        mostrarAlerta(MSG_ERRO_SALVAR, "danger");
        registrarAtividade("Remover", "Falha ao remover o registro", false);
    }
}

/** LISTAR: redesenha os totais e os cartões na página */
function listarRegistros() {
    desenharTotais();
    elLista.replaceChildren();

    if (registros.length === 0) {
        const vazio = document.createElement("p");
        vazio.className = "vazio";
        vazio.textContent = "Nenhum registro ainda. Preencha o formulário para começar.";
        elLista.appendChild(vazio);
        return;
    }

    // Mais recentes primeiro (cópia da lista, para não alterar a original)
    const ordenados = registros.slice().sort(function (a, b) {
        return a.data < b.data ? 1 : a.data > b.data ? -1 : 0;
    });

    ordenados.forEach(function (item) {
        elLista.appendChild(criarCartao(item));
    });
}

/** Monta o cartão de um registro (só textContent, nunca innerHTML). */
function criarCartao(item) {
    const tipo = TIPOS[item.tipo];

    const cartao = document.createElement("article");
    cartao.className = "card-registro";

    const topo = document.createElement("div");
    topo.className = "card-registro-topo";

    const titulo = document.createElement("h3");
    titulo.textContent = tipo.emoji + " " + tipo.nome;

    const selo = document.createElement("span");
    selo.className = "selo";
    selo.textContent = LOCAIS[item.local];

    topo.append(titulo, selo);

    const descricao = document.createElement("p");
    descricao.className = "descricao-registro";
    descricao.textContent = item.descricao;

    const detalhes = document.createElement("p");
    detalhes.className = "detalhes-registro";
    detalhes.textContent = item.quantidade.toLocaleString("pt-BR") + " " + tipo.unidade
        + " · " + formatarData(item.data);

    const acoes = document.createElement("div");
    acoes.className = "acoes";

    const btnEditar = document.createElement("button");
    btnEditar.type = "button";
    btnEditar.className = "btn btn-sm btn-outline-success";
    btnEditar.textContent = "Editar";
    btnEditar.addEventListener("click", function () { iniciarEdicao(item.id); });

    const btnRemover = document.createElement("button");
    btnRemover.type = "button";
    btnRemover.className = "btn btn-sm btn-outline-danger";
    btnRemover.textContent = "Remover";
    btnRemover.addEventListener("click", function () { removerRegistro(item.id); });

    acoes.append(btnEditar, btnRemover);
    cartao.append(topo, descricao, detalhes, acoes);
    return cartao;
}

/** Soma as quantidades por tipo e mostra no topo da lista. */
function desenharTotais() {
    elTotais.replaceChildren();

    Object.keys(TIPOS).forEach(function (chave) {
        const tipo = TIPOS[chave];
        const soma = registros
            .filter(function (r) { return r.tipo === chave; })
            .reduce(function (acc, r) { return acc + r.quantidade; }, 0);

        const caixa = document.createElement("div");
        caixa.className = "total-item";

        const rotulo = document.createElement("span");
        rotulo.textContent = tipo.emoji + " " + tipo.nome;

        const valor = document.createElement("strong");
        valor.textContent = soma.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " " + tipo.unidade;

        caixa.append(rotulo, valor);
        elTotais.appendChild(caixa);
    });
}

/* ============================
   FORMULÁRIO
   ============================ */

/** Mostra no campo de quantidade a unidade do tipo escolhido. */
function atualizarUnidade() {
    const tipo = document.getElementById("tipo").value;
    const ajuda = document.getElementById("ajuda-quantidade");
    ajuda.textContent = Object.prototype.hasOwnProperty.call(TIPOS, tipo)
        ? "Unidade: " + TIPOS[tipo].unidade
        : "Escolha o tipo para ver a unidade.";
}

/** Volta o formulário ao estado inicial (modo "adicionar"). */
function limparFormulario() {
    form.reset();
    document.getElementById("data").value = dataDeHoje();
    mostrarErros({});
    atualizarUnidade();

    idEmEdicao = null;
    btnSalvar.textContent = "Adicionar registro";
    btnCancelar.classList.add("d-none");
}

/** Envio do formulário: valida e decide entre adicionar e editar. */
function aoEnviar(evento) {
    evento.preventDefault();
    esconderAlerta();

    const dados = lerFormulario();
    const erros = coletarErros(dados);
    mostrarErros(erros);

    const primeiroComErro = CAMPOS.find(function (nome) { return erros[nome]; });
    if (primeiroComErro) {
        mostrarAlerta("Revise os campos destacados.", "danger");
        document.getElementById(primeiroComErro).focus();
        registrarAtividade(
            idEmEdicao ? "Editar" : "Adicionar",
            "Dados inválidos, nada foi salvo",
            false
        );
        return;
    }

    if (idEmEdicao) {
        salvarEdicao(dados);
    } else {
        adicionarRegistro(dados);
    }
}

/** Valida um único campo (usado ao sair do campo e ao digitar). */
function validarUmCampo(nome) {
    const erros = coletarErros(lerFormulario());
    mostrarErroDoCampo(nome, erros[nome]);
}

/* ============================
   INÍCIO
   ============================ */

function iniciar() {
    // Datas permitidas no campo de data
    const campoData = document.getElementById("data");
    campoData.max = dataDeHoje();
    campoData.value = dataDeHoje();

    // Eventos
    form.addEventListener("submit", aoEnviar);
    btnCancelar.addEventListener("click", cancelarEdicao);
    document.getElementById("tipo").addEventListener("change", atualizarUnidade);

    CAMPOS.forEach(function (nome) {
        const campo = document.getElementById(nome);
        campo.addEventListener("blur", function () { validarUmCampo(nome); });
        campo.addEventListener("input", function () {
            // Se o campo já estava com erro, corrige a mensagem enquanto digita
            if (campo.classList.contains("is-invalid")) validarUmCampo(nome);
        });
    });

    // Carrega os dados guardados
    try {
        registros = carregarDados();
        registrarAtividade(
            "Carregar",
            registros.length + (registros.length === 1 ? " registro carregado" : " registros carregados")
        );
    } catch (erro) {
        console.error(erro);
        registros = [];
        mostrarAlerta(MSG_ERRO_CARGA, "danger");
        registrarAtividade("Carregar", "Falha ao carregar os dados", false);
    }

    atualizarUnidade();
    listarRegistros();
    desenharAtividades();
}

iniciar();