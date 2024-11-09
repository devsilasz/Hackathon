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
Contexto:
Um enfermeiro está realizando a triagem de um paciente que apresenta sintomas específicos. O objetivo é identificar três doenças principais que possam estar associadas a esses sintomas e fornecer uma sugestão de tratamento breve para cada uma.

Instruções:
- Liste apenas as 3 principais doenças relacionadas aos sintomas fornecidos, com uma descrição breve de cada uma.
- Para cada doença, inclua um possível tratamento resumido.
- A saída deve estar no formato:

Principais doenças: 
1. [Nome da Doença 1]: [Descrição resumida da doença]
2. [Nome da Doença 2]: [Descrição resumida da doença]
3. [Nome da Doença 3]: [Descrição resumida da doença]

Possíveis tratamentos para as respectivas doenças: 
1. [Tratamento resumido para Doença 1]
2. [Tratamento resumido para Doença 2]
3. [Tratamento resumido para Doença 3]

Dados do paciente:
Doenças ou Intolerâncias Prévias: ${doencasIntolerancias || "Não informado"}
Sintomas do Paciente: ${sintomas}
`;

// Função para formatar e processar a saída da IA
function formatarRespostaIA(textoIA, doencasIntolerancias, sintomas) {
    // Extrair as três principais doenças e tratamentos usando expressão regular para capturar os itens numerados
    const regexDoenca = /\d+\.\s+(.+?):\s+(.+?)(?=\d+\.\s+|$)/g;
    const matches = [...textoIA.matchAll(regexDoenca)].slice(0, 3);

    if (matches.length < 3) {
        return "Diagnóstico não gerado corretamente. Favor revisar a resposta da IA.";
    }

    // Formatar doenças e tratamentos com quebras de linha e estrutura clara
    const principaisDoencas = matches.map((match, index) => `${index + 1}. ${match[1].trim()}: ${match[2].trim()}`);
    const tratamentos = matches.map((match, index) => `${index + 1}. Tratamento para ${match[1].trim()}: [Descrição do tratamento]`);

    return `
Principais doenças: 
${principaisDoencas.join('\n')}

Possíveis tratamentos para as respectivas doenças: 
${tratamentos.join('\n')}

Dados do paciente:
Doenças ou Intolerâncias Prévias: ${doencasIntolerancias || "Não informado"}
Sintomas do Paciente: ${sintomas}

*Nota: Este diagnóstico deve ser revisado por um profissional.*
    `.trim();
}

// Função para analisar sintomas com a IA Llama e formatar a resposta
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
                        content: prompt  // Aqui passamos o prompt formatado
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error('Erro ao se comunicar com a API Llama');
        }

        const data = await response.json();
        const respostaCompleta = data.choices[0].message.content;

        // Formata a resposta para o formato desejado
        return formatarRespostaIA(respostaCompleta, doencasIntolerancias, sintomas);
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
