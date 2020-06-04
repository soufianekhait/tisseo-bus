module.exports = (models, Op, Sequelize) => {
    const express = require('express');
    const router = express.Router();
    const {Station, Bus, Arret} = models;
    const csrf = require('csurf');
    const csrfProtection = csrf({ cookie: true });
    const { check, validationResult } = require('express-validator');

    router.get('/', csrfProtection, async (req, res, next) => {
        const limit = 10; // results per page
        const currentPage = parseInt(req.query.page) || 1; // current page
        const offset = (limit * currentPage) - limit;

        try{
            const { count, rows } = await Bus.findAndCountAll({ subQuery: false, include:[
                { model: Station, as: 'stop', required: true},
                    { model: Station, as: 'depart', required: true },
                    { model: Station, as: 'terminus', required: true,}
            ], order: [[{ model: Station, as: 'stop' } , 'nom_station', 'ASC']],
                    offset: offset, limit: limit, attributes: ['num_ligne'], raw: true });

            const nbPages = Math.round(count/limit);

            const trajets = await Bus.findAll({ subQuery: false, include:[
                    { model: Station, as: 'depart', required: true, attributes: ['nom_station', 'id_station'] },
                    { model: Station, as: 'terminus', required: true, attributes: ['nom_station', 'id_station']}
                ], order: [[{ model: Station, as: 'depart' } , 'nom_station', 'ASC']],
                attributes: ['id_trajet', 'num_ligne'], raw: true });

            if (req.query.page > nbPages || req.query.page <= 0)
                next();
            else
                res.render('arrets', { arrets: rows,
                    currentPage, pages:
                    nbPages,
                    count,
                    limit,
                    trajets,
                    active: 'arrets',
                    csrfToken: req.csrfToken()
                });
            } catch (err) {
                throw new Error(err);
            }
        }, function (req,res) {
        res.render('404');
    });

    router.post('/add', csrfProtection, [
        check('nomArret')
            .isString().withMessage('Le nom de l\'arrêt doit être une chaîne de caractères')
            .notEmpty().withMessage('Le nom de l\'arrêt est obligatoire')
            .isLength({ min: 3 }).withMessage('Le nom de l\'arrêt doit contenir 3 caractères minimum')
            .trim(),
        check('longitudeArret')
            .notEmpty().withMessage('La longitude de l\'arrêt est obligatoire')
            .isNumeric().withMessage('Longitude de l\'arrêt doit être numérique')
            .trim(),
        check('latitudeArret')
            .notEmpty().withMessage('La latitude de l\'arrêt est obligatoire')
            .isNumeric().withMessage('Latitude de l\'arrêt doit être numérique')
            .trim()
    ], async (req, res) =>{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({
                data: req.body,
                errors: errors.mapped(),
                csrfToken: req.csrfToken()
            }));
        }

        const formatLigne = req.body.trajetArret.split('_');
        const existingStation = await Station.findOne({where: {nom_station: req.body.nomArret}});

        Bus.findOne({ where:{ id_trajet: formatLigne[0] } }).then( async (trajet) => {
            if (existingStation) {
                await Arret.create({
                    id_trajet: trajet.id_trajet,
                    id_station: existingStation.id_station
                }).then((arret) => {
                    req.flash('success', `La balise ${req.body.nomArret} a bien été ajoutée. Les coordonnées géographiques restent les mêmes que celles du premier arrêt créé.`);
                    return res.status(200).json({ response: "Item added" });
                }).catch(err =>{
                    if (err.name === 'SequelizeUniqueConstraintError') {
                        req.flash('failed', `L'arrêt ${req.body.nomArret} existe déjà sur la ligne que vous avez choisie !`);
                        return res.status(200).json({ response: "Item exists" });
                    }
                    throw new Error(err);
                });
            } else {
                const station = await Station.create({
                    nom_station: req.body.nomArret,
                    latitude_station: req.body.latitudeArret,
                    longitude_station: req.body.longitudeArret,
                });
                await Arret.create({
                    id_trajet: trajet.id_trajet,
                    id_station: station.id_station
                });
                req.flash('success', `La balise ${req.body.nomArret} a bien été ajoutée sur la ligne choisie.`);
                return res.status(200).json({ response: "Item added" });
            }
        }).catch(err => {
            throw new Error(err);
        });
    });

    router.get('/delete/:trajetID/:stationID', async (req, res)=>{
        try{
            await Arret.destroy({ where:{ id_trajet: req.params.trajetID, id_station: req.params.stationID } });
        } catch(err){
            throw new Error(err);
        }
        const arret = await Station.findByPk(req.params.stationID);
        req.flash('success', `L'arrêt ${arret.nom_station} a bien été supprimé de la ligne associée.`);
        res.status(200).send("Item deleted");
    });

    router.post('/update', csrfProtection, [
        check('nomArret')
            .isString().withMessage('Le nom de l\'arrêt doit être une chaîne de caractères')
            .notEmpty().withMessage('Le nom de l\'arrêt est obligatoire')
            .isLength({ min: 3 }).withMessage('Le nom de l\'arrêt doit contenir 3 caractères minimum')
            .trim(),
        check('longitudeArret')
            .notEmpty().withMessage('La longitude de l\'arrêt est obligatoire')
            .isNumeric().withMessage('Longitude de l\'arrêt doit être numérique')
            .trim(),
        check('latitudeArret')
            .notEmpty().withMessage('La latitude de l\'arrêt est obligatoire')
            .isNumeric().withMessage('Latitude de l\'arrêt doit être numérique')
            .trim()
    ], async (req, res) =>{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({
                data: req.body,
                errors: errors.mapped(),
                csrfToken: req.csrfToken()
            }));
        }

    });

    router.post('/search', async (req,res) =>{
        try{
            const {count, rows} = await Beacon.findAndCountAll({ where:{ id:{ [Op.like]: `%${req.body.id}%` }}});
            res.render('recherche-balise', { beacons: rows, countBeacons: count, keyword: req.body.id });
        } catch(err){
            throw new Error(err);
        }
    });

    return router;
};