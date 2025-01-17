#!/usr/bin/env node

const express = require('express');
const fs = require('node:fs/promises');


const read_dictionary = async function(path) {
    var dictionary = [];
    console.log('loading dictionary '+path);
    const file = await fs.open(path);
    for await (const line of file.readLines()) {
        if (/^[a-z]{3,}$/.test(line))
            dictionary.push(line);
    }
    console.log('finished loading dictionary '+path+' ('+dictionary.length+' words)');
    return dictionary;
};

var dictionaries = {};
const dictionary_path = {'en': 'data/en.dict'};
const get_dictionary = async function(lang) {
    if (!(lang in dictionary_path))
        throw new Error('dictionary not found for language '+lang);
    if (!(lang in dictionaries)) {
        dictionaries[lang] = await read_dictionary(dictionary_path[lang]);
    }
    return dictionaries[lang];
};

const dictionary_find = async function(lang, letters) {
    const dictionary = await get_dictionary(lang);
    words = [];
    for (const word of dictionary) {
        pool = word.split('');
        if (pool.every(letter => pool.filter(c => c === letter).length <= letters.filter(c => c === letter).length))
            words.push(word);
    }
    return words;
}


const app = express();

app.use(express.static('static', {index: 'index.html', dotfiles: 'ignore'}));
app.get('/words', (req, res, next) => {
    lang = req.query['lang'] || 'en';
    letters = req.query['letters'] || '';
    letters = letters.replace(/[^a-zA-Z]/g, '').toLowerCase();
    console.log('find: lang: '+lang+', letter: '+letters);
    words = dictionary_find(lang, letters.split('')).then((words) => {
	sorted = {};
        for (const word of words) {
            if (!(word.length in sorted))
                sorted[word.length] = [];
            sorted[word.length].push(word);
        }
        res.status(200).send(JSON.stringify({'letters': letters, 'results': sorted}));
    });
});
app.use((req, res, next) => {
    res.status(404).send('not found');
});
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).send('server error')
});


const port = process.argv[2] || 80;

app.set('trust proxy', true);
app.set('x-powered-by', false);
app.listen(port, () => {
    console.log('words server listening on port '+port);
});
