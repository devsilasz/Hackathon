let recognition;
const symptomsInputElement = document.getElementById("symptomsInput");
const statusFilaElement = document.getElementById("statusFila");
const nomeInputElement = document.getElementById("nomeInput");

const GROQ_API_KEY = "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";
let userId;

// Função para entrar na fila
async function entrarNaFila() {
    const nome = nomeInputElement.value.trim();
    if (!nome) {
        alert("Por favor, insira seu nome para entrar na fila.");
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/fila', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome })
        });
        const data = await response.json();
        userId = data.id;

        console.log("User ID:", userId);  // Exibe o userId no console para testes

        localStorage.setItem("userId", userId);
        statusFilaElement.textContent = `Você entrou na fila com o ID ${userId}.`;
        mostrarSintomas();
    } catch (error) {
        console.error("Erro ao entrar na fila:", error);
    }
}

// Função para exibir a interface de sintomas
function mostrarSintomas() {
    document.getElementById('filaContainer').style.display = 'none';
    document.getElementById('sintomasContainer').style.display = 'block';
}

// Restante do código permanece o mesmo...


// Função para iniciar o reconhecimento de voz
function startRecording() {
    if (!("webkitSpeechRecognition" in window)) {
        alert("API de reconhecimento de voz não é suportada neste navegador.");
        return;
    }

    recognition = new webkitSpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = function() {
        symptomsInputElement.placeholder = "Ouvindo...";
    };

    recognition.onresult = function(event) {
        const text = event.results[0][0].transcript;
        symptomsInputElement.value = text;
    };

    recognition.onerror = function(event) {
        console.error("Erro no reconhecimento de voz: ", event.error);
        symptomsInputElement.placeholder = "Erro no reconhecimento. Tente novamente.";
    };

    recognition.start();
}

// Função para chamada à API da Groq para análise de sintomas
async function analyzeSymptomsWithGroq(symptoms) {
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: "llama3-8b-8192",
                messages: [
                    {
                        role: "user",
                        content: `Paciente apresenta os seguintes sintomas: ${symptoms}. Qual é o possível diagnóstico?`
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error('Erro ao se comunicar com a API da Groq');
        }

        const data = await response.json();
        return data.choices[0].message.content; // Diagnóstico fornecido pela API da Groq
    } catch (error) {
        console.error("Erro ao usar a API da Groq:", error);
        return null;
    }
}

// Função para formatar o texto do diagnóstico em parágrafos
function formatDiagnosisText(diagnosisText) {
    // Divide o texto em parágrafos onde há ponto final seguido de espaço ou nova linha
    const paragraphs = diagnosisText.split(/(?:\. |\n)/g);
    return paragraphs.map(paragraph => `<p>${paragraph.trim()}</p>`).join("");
}

// Função principal para processar os sintomas com a API da Groq
async function analyzeSymptoms() {
    const symptomsText = symptomsInputElement.value.trim();
    if (!symptomsText) {
        alert("Por favor, digite ou fale seus sintomas antes de prosseguir.");
        return;
    }

    try {
        // Envia os sintomas para o servidor para atualizar o status
        await fetch(`http://localhost:3000/fila/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sintomas: symptomsText })
        });

        alert("Sintomas enviados com sucesso.");
        redirecionarParaEspera();
    } catch (error) {
        console.error("Erro ao enviar sintomas:", error);
    }
}

// Função para redirecionar para a tela de espera
function redirecionarParaEspera() {
    document.getElementById('sintomasContainer').style.display = 'none';
    document.getElementById('telaEsperaContainer').style.display = 'block';
}
