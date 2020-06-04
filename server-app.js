// framework web
const express = require("express");
// librairie nodejs pour construire des chemins d'accès à des fichiers
const path = require('path');
const { Sequelize, Op } = require('sequelize');
const bodyParser = require('body-parser');
const nunjucks = require("nunjucks"); // moteur de rendu
const stopsRouter = require("./server/arrets.js");
const cookieParser = require('cookie-parser');
const flash = require('express-flash');
const session = require('express-session');
const favicon = require('serve-favicon');

function launchServer(){
    const tplPath = path.join(__dirname, 'templates');
    let  app = express();
    // set favicon
    app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
    //le répertoire dans lequel se trouvent les fichiers modèles
    app.set('views', tplPath);
    //le moteur de modèle à utiliser
    app.set('view engine', 'html');
    // configuration du moteur de rendu
    nunjucks.configure(tplPath, { autoescape: true, express: app });
    // pour décoder les données issues d'un formulaire POST
    app.use(bodyParser.urlencoded({ extended: true }));
    // parse cookies
    // we need this because "cookie" is true in csrfProtection
    app.use(cookieParser());
    app.use([ session({
        secret: 'super-secret-key',
        key: 'super-secret-cookie',
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 60000 }
    }), flash()]);
    // toutes les URL commençant par balises sont redirigées
    // vers l'objet beaconsRouter défini dans le fichier server/arrets.js
    app.use("/arrets", stopsRouter(models, Op, Sequelize));
    app.use("/public", express.static(path.join(__dirname, 'public')));
    app.get('/', (req, res) => {
        res.render(path.join(tplPath, "index.html"));
    });
    app.listen(3000,  () => console.log("Lancement du projet sur le port 3000"));
}

const sequelize = new Sequelize('sqlite://db/arretbus.db', {logging: false});
const models = sequelize.import(path.join(__dirname, 'server', 'models.js'));
launchServer();