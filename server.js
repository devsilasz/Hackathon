const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(cors());

let filaAtendimento = [];
let contadorID = 1;

const LLAMA_API_KEY = "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";

// Configuração dinâmica para importar node-fetch
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Função para processar e formatar a resposta da IA, limitando a três doenças e tratamentos
function formatarRespostaIA(textoIA) {
    const regexDoenca = /\d+\.\s+(.+?):\s+(.+?)(?=\d+\.\s+|$)/g;
    const matches = [...textoIA.matchAll(regexDoenca)].slice(0, 3); // Limita a 3 itens

    if (matches.length < 3) {
        return { error: "Diagnóstico não gerado corretamente. Favor revisar a resposta da IA." };
    }

    // Extrai e organiza doenças e tratamentos em um objeto estruturado
    const diagnostico = {
        doencas: matches.map((match, index) => ({
            nome: match[1].trim(),
            descricao: match[2].trim(),
            tratamento: `Tratamento para ${match[1].trim()}: [Descrição do tratamento]`
        }))
    };

    return diagnostico;
}

async function analisarSintomasComLlama(doencasIntolerancias, sintomas) {
    const prompt1 = `
    Contexto:
    Você é um enfermeiro que está realizando a triagem de um paciente com sintomas específicos. O objetivo é identificar as três principais doenças possíveis associadas a esses sintomas e fornecer uma sugestão de tratamento breve para cada uma.
    
    Instrução:
    - Responda listando apenas as 3 principais doenças que possam estar relacionadas aos sintomas.
    - Para cada doença, inclua um possível tratamento resumido.
    
    Organize a resposta exatamente no seguinte formato:
    Principais doenças: 
    1. [Nome da Doença 1]: [Descrição breve]
    2. [Nome da Doença 2]: [Descrição breve]
    3. [Nome da Doença 3]: [Descrição breve]
    
    Possíveis tratamentos para as respectivas doenças: 
    1. Tratamento para [Nome da Doença 1]: [Descrição resumida do tratamento]
    2. Tratamento para [Nome da Doença 2]: [Descrição resumida do tratamento]
    3. Tratamento para [Nome da Doença 3]: [Descrição resumida do tratamento]
    `;

    const input = `
    Dados do paciente:
    - Doenças ou Intolerâncias Prévias: ${doencasIntolerancias || "Não informado"}
    - Sintomas do Paciente: ${sintomas}
    `.trim();
    
    const params = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LLAMA_API_KEY}`
        },
        body: JSON.stringify({
            model: "llama3-8b-8192",
            messages: [
                {
                    role: "system",
                    content: prompt1
                },
                {
                    role: "user",
                    content: input
                }
            ]
        })
    };

    try {
        // Envia a requisição usando o objeto params
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', params);

        if (!response.ok) {
            throw new Error('Erro ao se comunicar com a API Llama');
        }

        const data = await response.json();
        const respostaCompleta = data.choices[0]?.message?.content;

        // Formata a resposta para o formato desejado
        return formatarRespostaIA(respostaCompleta);
    } catch (error) {
        console.error("Erro ao usar a API Llama:", error);
        return { error: "Não foi possível gerar o diagnóstico." };
    }
}

// Função para atualizar as posições na fila
function atualizarPosicoes() {
    filaAtendimento.forEach((usuario, index) => {
        usuario.posicao = index + 1;
        usuario.status = usuario.posicao === 1 ? 'pronto' : 'esperando';
    });
}

// Endpoint para adicionar usuário na fila
app.post('/fila', (req, res) => {
    const { nome } = req.body;
    const novoUsuario = {
        id: contadorID++,
        nome,
        posicao: filaAtendimento.length + 1,
        doencasIntolerancias: null,
        sintomas: null,
        diagnostico: null,
        status: 'esperando'
    };
    filaAtendimento.push(novoUsuario);
    atualizarPosicoes();
    res.status(201).json(novoUsuario);
});

// Endpoint para visualizar fila completa
app.get('/fila', (req, res) => {
    res.json(filaAtendimento);
});

// Endpoint para visualizar informações de um usuário na fila
app.get('/fila/:id', (req, res) => {
    const usuario = filaAtendimento.find(u => u.id === parseInt(req.params.id));
    if (!usuario) return res.status(404).json({ message: "Usuário não encontrado" });
    res.json(usuario);
});

// Endpoint para atualizar sintomas e gerar diagnóstico com a IA
app.put('/fila/:id', async (req, res) => {
    const { doencasIntolerancias, sintomas } = req.body;
    const usuario = filaAtendimento.find(u => u.id === parseInt(req.params.id));
    if (!usuario) return res.status(404).json({ message: "Usuário não encontrado" });

    usuario.doencasIntolerancias = doencasIntolerancias;
    usuario.sintomas = sintomas;
    const diagnostico = await analisarSintomasComLlama(doencasIntolerancias, sintomas);
    usuario.diagnostico = diagnostico;
    usuario.status = 'preenchido';

    atualizarPosicoes();

    res.json({ message: "Sintomas e diagnóstico atualizados com sucesso", usuario });
});

// Endpoint para remover um usuário da fila
app.delete('/fila/:id', (req, res) => {
    filaAtendimento = filaAtendimento.filter(u => u.id !== parseInt(req.params.id));
    atualizarPosicoes();
    res.json({ message: "Usuário removido da fila" });
});

// Configuração para servir arquivos estáticos
app.use(express.static(path.join(__dirname)));

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
