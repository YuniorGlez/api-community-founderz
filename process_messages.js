const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'data');
const dbPath = path.join(__dirname, 'db.json');
const peoplePath = path.join(dataPath, 'people', 'data.json');
const linkedinsPath = path.join(dataPath, 'linkedins', 'data.json');

const peopleData = JSON.parse(fs.readFileSync(peoplePath, 'utf8'));
const linkedinsData = JSON.parse(fs.readFileSync(linkedinsPath, 'utf8'));
let dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const users = {};

peopleData.messages.forEach(message => {
    const { author, content } = message;
    if (!users[author.id]) {
        users[author.id] = {
            id: author.id,
            name: author.name,
            avatar: author.avatarUrl,
            role: 'DESCONOCIDO', // Placeholder role
            thumbnail: 'https://via.placeholder.com/150', // Placeholder thumbnail
            linkedin: '',
            messages: []
        };
    }

    users[author.id].messages.push(content);
});

linkedinsData.messages.forEach(message => {
    const { author, content } = message;
    if (users[author.id]) {
        const linkedinUrl = content.match(/(https?:\/\/[^\s]*linkedin\.com[^\s]*)/i);
	if (linkedinUrl) {
            users[author.id].linkedin = linkedinUrl[0];
        }
    }
});

// Merge new users data with existing users data
// Convierte 'users' en un array y concaténalo con 'dbData.users'
const combinedUsers = [...dbData.users, ...Object.values(users)];

// Utiliza 'reduce' para eliminar duplicados y mantener los roles existentes
dbData.users = combinedUsers.reduce((acc, user) => {
    const existingUser = acc.find(u => u.id === user.id);
    if (existingUser) {
        // Si el usuario ya existe, combina los datos y mantiene el rol existente
        return acc.map(u => u.id === user.id ? { ...u, ...user, role: u.role, messages: [...u.messages, ...user.messages] } : u);
    } else {
        // Si el usuario no existe, simplemente añádelo
        return [...acc, user];
    }
}, []);


// Guarda el último ID del último mensaje de peopleData
if (peopleData.messages.length > 0) {
    const lastMessageIdPeople = peopleData.messages[peopleData.messages.length - 1].id;
    fs.writeFileSync(path.join(dataPath, 'people', 'lastMessageId.txt'), lastMessageIdPeople);
}

// Guarda el último ID del último mensaje de linkedinsData
if (linkedinsData.messages.length > 0) {
    const lastMessageIdLinkedins = linkedinsData.messages[linkedinsData.messages.length - 1].id;
    fs.writeFileSync(path.join(dataPath, 'linkedins', 'lastMessageId.txt'), lastMessageIdLinkedins);
}
dbData.linkedins = []; // Vaciamos el objeto linkedins
dbData.people = []; // Vaciamos el objeto people

console.log( {len : dbData.users.length});
fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2));

// Elimina los archivos de datos antiguos
fs.writeFileSync(peoplePath, JSON.stringify(dbData.people, null, 2));
fs.writeFileSync(linkedinsPath, JSON.stringify(dbData.linkedins, null, 2));


