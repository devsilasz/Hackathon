const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const pool = require('./db'); // Importa o pool de conexões com o banco de dados

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
Sou um enfermeiro realizando a triagem de um paciente que apresenta sintomas específicos. O objetivo é identificar três doenças principais que possam estar associadas a esses sintomas e fornecer uma sugestão de tratamento breve para cada uma.

Instruções:
- Liste apenas as 3 principais doenças relacionadas aos sintomas fornecidos, com uma descrição breve de cada uma.
- Para cada doença, inclua um possível tratamento resumido com base nas melhores práticas médicas.
- A saída deve estar no formato:

- Organize a resposta exatamente no seguinte formato:

Possíveis tratamentos para as respectivas doenças:  
1. Tratamento resumido para Doença 1: [Descrição resumida do tratamento para Doença 1]
2. Tratamento resumido para Doença 2: [Descrição resumida do tratamento para Doença 2]
3. Tratamento resumido para Doença 3: [Descrição resumida do tratamento para Doença 3]

Dados do paciente:
Doenças ou Intolerâncias Prévias: ${doencasIntolerancias || "Não informado"}
Sintomas do Paciente: ${sintomas}
`;


// Função para formatar a saída da IA
function formatarRespostaIA(textoIA, doencasIntolerancias, sintomas) {
    // Expressão regular para capturar doenças e tratamentos
    const regexDoencas = /(\d+)\.\s+(.+?):\s+(.+?)(?=\n|$)/g;
    const regexTratamentos = /(\d+)\.\s+Tratamento resumido para (.+?):\s+(.+?)(?=\n|$)/g;

    // Encontrar as doenças e tratamentos
    const doencas = [...textoIA.matchAll(regexDoencas)].map((match) => ({
        nome: match[2].trim(),
        descricao: match[3].trim(),
    }));
    const tratamentos = [...textoIA.matchAll(regexTratamentos)].map((match) => ({
        nome: match[2].trim(),
        descricao: match[3].trim(),
    }));

    // Limitar o número de doenças e tratamentos a 3
    const principaisDoencas = doencas.slice(0, 3).map((doenca, index) => `${index + 1}. ${doenca.nome}: ${doenca.descricao}`);
    const tratamentosFormatados = tratamentos.slice(0, 3).map((tratamento, index) => `${index + 1}. Tratamento resumido para ${tratamento.nome}: ${tratamento.descricao}`);

    return `
Doenças ou Intolerâncias Prévias: ${doencasIntolerancias || "Não informado"}
Sintomas do Paciente: ${sintomas}

Principais doenças: 
${principaisDoencas.join('\n')}

Possíveis tratamentos para as respectivas doenças: 
${tratamentosFormatados.join('\n')}

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

// Endpoint para registrar um novo paciente
app.post('/registro', async (req, res) => {
    const { nome_completo, data_nascimento, sexo, estado_civil, cpf, rg_ou_documento, cartao_sus, endereco_completo, telefone_contato, email } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO Paciente (nome_completo, data_nascimento, sexo, estado_civil, cpf, rg_ou_documento, cartao_sus, endereco_completo, telefone_contato, email)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id_paciente`,
            [nome_completo, data_nascimento, sexo, estado_civil, cpf, rg_ou_documento, cartao_sus, endereco_completo, telefone_contato, email]
        );

        res.status(201).json({ message: "Paciente registrado com sucesso", id: result.rows[0].id_paciente });
    } catch (error) {
        console.error("Erro ao registrar paciente:", error);
        res.status(500).json({ message: "Erro ao registrar paciente", error });
    }
});

// Endpoint para adicionar usuário na fila de triagem
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

// Função para atualizar as posições na fila
function atualizarPosicoes() {
    filaAtendimento.forEach((usuario, index) => {
        usuario.posicao = index + 1;
        usuario.status = usuario.posicao === 1 ? 'pronto' : 'esperando';
    });
}

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

// Configuração para servir arquivos estáticos
app.use(express.static(path.join(__dirname)));

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
