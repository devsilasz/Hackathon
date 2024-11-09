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

// Função para formatar o prompt de entrada para a IA
const promptInput = (doencasIntolerancias, sintomas) => `
Doenças ou Intolerâncias Prévias: ${doencasIntolerancias}
Sintomas do Paciente: ${sintomas}
Possíveis doenças (REVISAR): 
`;

// Função para analisar sintomas com a IA Llama
async function analisarSintomasComLlama(doencasIntolerancias, sintomas) {
    const prompt = promptInput(doencasIntolerancias, sintomas);
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${LLAMA_API_KEY}`
            },
            body: JSON.stringify({
                model: "llama3-8b-8192",
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error('Erro ao se comunicar com a API Llama');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error("Erro ao usar a API Llama:", error);
        return "Não foi possível gerar o diagnóstico.";
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
