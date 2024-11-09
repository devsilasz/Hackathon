// triagem.js

let recognition;
const symptomsInputElement = document.getElementById("symptomsInput");
const diagnosisTextElement = document.getElementById("diagnosisText");

// Chave de API Groq embutida
const GROQ_API_KEY = "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";

// Função para iniciar o reconhecimento de voz como alternativa de entrada
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
        symptomsInputElement.value = text; // Exibir o texto reconhecido no campo de sintomas
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

// Função principal para processar os sintomas com a API da Groq
async function analyzeSymptoms() {
    const symptomsText = symptomsInputElement.value.trim();

    if (!symptomsText) {
        alert("Por favor, digite ou fale seus sintomas antes de prosseguir.");
        return;
    }

    const groqAnalysis = await analyzeSymptomsWithGroq(symptomsText);
    if (!groqAnalysis) {
        diagnosisTextElement.textContent = "Erro na análise da API da Groq";
        return;
    }

    diagnosisTextElement.textContent = `Diagnóstico: ${groqAnalysis}`;
    localStorage.setItem("diagnosisResult", groqAnalysis);
}

// Função para sintetizar a fala do diagnóstico, acessível pelo botão de áudio
function speakResults() {
    const synthesis = window.speechSynthesis;
    const diagnosisResult = localStorage.getItem("diagnosisResult");

    if (!diagnosisResult) {
        alert("Nenhum diagnóstico foi gerado ainda.");
        return;
    }

    const utterance = new SpeechSynthesisUtterance(diagnosisResult);
    utterance.lang = "pt-BR";
    synthesis.speak(utterance);
}
