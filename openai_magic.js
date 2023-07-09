const _MODEL = true? 'gpt-4' : 'gpt-3.5-turbo-16k';
const _MAX_USERS = 100;
const _LIMIT_CHARS = 1000;
const _MAX_CHARS_TO_OPENAI = 10000;
const _NEW_INTENT = false;

const path = require('path');
const dbPath = path.join(__dirname, 'db.json');

const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
	apiKey: process.env.OPENAI_API_KEY,
	organization: "org-7CCjVZVzKPf4GH3Pgu2daRv4"
});
const openai = new OpenAIApi(configuration);

const fs = require('fs');

async function categorizeUsers() {
    // 1. Obtén los datos de los usuarios
    const data = JSON.parse(fs.readFileSync(dbPath));
    const users = data.users;

    // 2. Prepara los mensajes de los usuarios para el prompt
    let userMessages = '';
    let usersToCategorize = [];
    for (const user of users) {
        // Inicializa metaOpenAI si no existe
        
	if (!user.metaOpenAI) {
            user.metaOpenAI = {
                intents: 0,
                numMsgsPrevIntent: 0,
                lastIntentTimestamps: null,
                classified: false
            };
        }
	if (usersToCategorize.length > _MAX_USERS || userMessages.length + 1000 > _MAX_CHARS_TO_OPENAI ) { continue; }
        // Solo intenta categorizar a los usuarios que tienen más mensajes que en el último intento y que no se han intentado más de 5 veces
        if ( ( ( _NEW_INTENT || user.messages.length > user.metaOpenAI.numMsgsPrevIntent) && user.metaOpenAI.intents < 5 && !user.metaOpenAI.classified) ) {
            userMessages += `Usuario ${user.id}: ${user.messages.map(t => t.trim().substring(0, _LIMIT_CHARS)).join(' ')}\n`;
            usersToCategorize.push(user);
        }
    }

	if (usersToCategorize.length == 0) return;
    // 3. Prepara el prompt
    const categories = [ 'Desarrollador', 'Diseñador', 'Gerente de producto', 'Marketero', 'Ventas', 'Recursos humanos', 'CEO', 'CTO', 'CFO', 'COO', 'Inversor', 'Emprendedor', 'Estudiante', 'Profesor', 'Investigador', 'Data Scientist', 'Ingeniero de Machine Learning', 'Ingeniero de Backend', 'Ingeniero de Frontend', 'Ingeniero de Full Stack', 'C-Levels', 'Otros'];
    const prompt = `Tenemos una serie de usuarios que han dejado mensajes en nuestra plataforma. Basándonos en estos mensajes, nos gustaría categorizar a cada usuario en una de las siguientes categorías: ${categories.join(', ')}. Si no hay suficiente información en los mensajes de un usuario para hacer una clasificación, por favor indica "NULL" para ese usuario. Aquí están los mensajes:\n\n${userMessages}\nPor favor, asigna una categoría a cada usuario. La respuesta debe estar en el formato "Usuario {id}: {Categoría}". No añadas nada antes o después de la lista de categorizaciones.`;


	console.log(`Tamaño del prompt en chars = ${prompt.length} `);

    // 4. Haz la llamada a la API de OpenAI
const response = await openai.createChatCompletion({
    model: _MODEL,
    messages: [ { role: "user" , content: prompt }],
    max_tokens: 60 * usersToCategorize.length, // ajusta esto según sea necesario
});


	// 5. Procesa la respuesta
    console.log(`Analizados ${usersToCategorize.length} usuarios`);
	const categorizations = response.data.choices[0].message.content.trim().split('\n');
    for (let i = 0; i < usersToCategorize.length && i < categorizations.length; i++) {
        const category = categorizations[i].split(': ')[1];
        usersToCategorize[i].role = categories.includes(category) ? category: 'DESCONOCIDO';
        usersToCategorize[i].metaOpenAI.intents++;
        usersToCategorize[i].metaOpenAI.numMsgsPrevIntent = usersToCategorize[i].messages.length;
        usersToCategorize[i].metaOpenAI.lastIntentTimestamps = new Date().toISOString();
        // Si OpenAI ha proporcionado una categoría válida, marca al usuario como clasificado correctamente
        if (category !== 'NULL') {
            usersToCategorize[i].metaOpenAI.classified = true;
        }
    }

    // 6. Guarda las categorías
    fs.writeFileSync('./db.json', JSON.stringify(data, null, 2));
}

categorizeUsers().catch(error => {
    console.error(error);
	const errorMessage = `[${new Date().toISOString()}] Error: ${error.message}\n`;
    fs.appendFileSync('./error.log', errorMessage);
});

