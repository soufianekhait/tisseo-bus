module.exports = (models, Op) => {
    const express = require('express');
    const router = express.Router();
    const {Station, Bus, Arret} = models;
    const csrf = require('csurf');
    const csrfProtection = csrf({ cookie: true });
    const { check, validationResult } = require('express-validator');

    const trajets = async () => {
        try {
            return await Bus.findAll({
                subQuery: false, include: [
                    {model: Station, as: 'depart', required: true, attributes: ['nom_station', 'id_station']},
                    {model: Station, as: 'terminus', required: true, attributes: ['nom_station', 'id_station']}
                ], order: [[{model: Station, as: 'depart'}, 'nom_station', 'ASC']],
                attributes: ['id_trajet', 'num_ligne'], raw: true
            });
        } catch(e){
            throw new Error(e);
        }
    };


    function pagination(current){
        let displayedLinks = 10;
        let maxLeft = current - Math.floor(displayedLinks/2);
        let maxRight = current + Math.floor(displayedLinks/2);

        if (maxLeft < 1){
            maxLeft = 1;
            maxRight = displayedLinks;
        }
        if (maxRight > current){
            maxLeft = current - (displayedLinks - 1);
            if (current > displayedLinks)
                maxRight = current;
            else
                maxRight = displayedLinks;
            if (maxLeft < 1)
                maxLeft = 1;
        }
        return { maxLeft, maxRight };
    }


    router.get('/', csrfProtection, async (req, res, next) => {
        const limit = 10; // results per page
        const currentPage = parseInt(req.query.page) || 1; // current page
        const offset = (limit * currentPage) - limit;

        try{
            // Find and count all stations where buses stop
            let { count, rows: arrets } = await Bus.findAndCountAll({ subQuery: false, include:[
                    { model: Station, as: 'stop', required: true},
                    { model: Station, as: 'depart', required: true },
                    { model: Station, as: 'terminus', required: true,}
            ], order: [[{ model: Station, as: 'depart' } , 'nom_station', 'ASC']],
                    offset: offset, limit: limit, attributes: ['num_ligne'], raw: true });

            const nbPages = Math.round(count/limit);

            if (req.query.page > nbPages || req.query.page <= 0)
                next();
            else
                res.render('arrets', { arrets, trajets : await trajets(),
                    currentPage, nbPages,
                    count,
                    active: 'arrets',
                    csrfToken: req.csrfToken(),
                    maxLeft: pagination(currentPage).maxLeft,
                    maxRight: pagination(currentPage).maxRight,
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
            .trim(), // sanitize it
        check('longitudeArret')
            .notEmpty().withMessage('La longitude de l\'arrêt est obligatoire')
            .isNumeric().withMessage('Longitude de l\'arrêt doit être un entier')
            .isFloat({ min: -90, max: 90 }).withMessage('Longitude doit être comprise entre -90° et 90°')
            .trim(), // sanitize it
        check('latitudeArret')
            .notEmpty().withMessage('La latitude de l\'arrêt est obligatoire')
            .isNumeric().withMessage('Latitude de l\'arrêt doit être un entier')
            .isFloat({ min: -90, max: 90 }).withMessage('Latitude doit être comprise entre -90° et 90°')
            .trim(), // sanitize it
        check('trajetArret')
            .custom(async value =>{
                const listTrajets = await trajets();
                if (!(value in listTrajets.map(trajet => trajet.id_trajet ))){
                    throw new Error('Le trajet doit faire partie de la liste proposée');
                }
            }),
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

        const existingStation = await Station.findOne({where: {nom_station: req.body.nomArret}});

        Bus.findOne({ where:{ id_trajet: req.body.trajetArret } }).then( async (trajet) => {
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
        const station = await Station.findByPk(req.params.stationID);
        req.flash('success', `L'arrêt ${station.nom_station} a bien été supprimé de la ligne associée.`);
        res.status(200).send("Item deleted");
    });

    router.get('/delete/:array', async (req, res)=>{
        console.log(req.params.array);
    });

    router.get('/update/:arretId', async (req, res)=>{
        const station = await Station.findOne({ where: { id_station: req.params.arretId }});

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ response: "Got the items' values", data: station }));
    });

    router.post('/update', csrfProtection, [
        check('nomArret')
            .isString().withMessage('Le nom de l\'arrêt doit être une chaîne de caractères')
            .notEmpty().withMessage('Le nom de l\'arrêt est obligatoire')
            .isLength({ min: 3 }).withMessage('Le nom de l\'arrêt doit contenir 3 caractères minimum')
            .trim(), // sanitize it
        check('longitudeArret')
            .notEmpty().withMessage('La longitude de l\'arrêt est obligatoire')
            .isNumeric().withMessage('Longitude de l\'arrêt doit être un entier')
            .isFloat({ min: -90, max: 90 }).withMessage('Longitude doit être comprise entre -90° et 90°')
            .trim(), // sanitize it
        check('latitudeArret')
            .notEmpty().withMessage('La latitude de l\'arrêt est obligatoire')
            .isNumeric().withMessage('Latitude de l\'arrêt doit être un entier')
            .isFloat({ min: -90, max: 90 }).withMessage('Latitude doit être comprise entre -90° et 90°')
            .trim(), // sanitize it
        check('trajetArret')
            .custom(async value =>{
                const listTrajets = await trajets();
                if (!(value in listTrajets.map(trajet => trajet.id_trajet ))){
                    throw new Error('Le trajet doit faire partie de la liste proposée');
                }
            }),
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

        const stationFound = await Station.findOne({where: { nom_station: req.body.nomArret }});
        const oldTrajet = await Arret.findOne({where: [{ id_trajet: req.body.oldIdTrajet }, { id_station: req.body.oldIdArret }]});

        if(stationFound){
            stationFound.longitude_station = req.body.longitudeArret;
            stationFound.latitude_station = req.body.latitudeArret;
            if (oldTrajet){
                await oldTrajet.destroy();
                await stationFound.save();
                await Arret.create({
                    id_trajet: req.body.trajetArret,
                    id_station: stationFound.id_station
                });
            }
        } else{
            const newStation = await Station.create({
                nom_station: req.body.nomArret,
                longitude_station: req.body.longitudeArret,
                latitude_station: req.body.latitudeArret
            });
            oldTrajet.destroy();
            await Arret.create({
                id_trajet: req.body.trajetArret,
                id_station: newStation.id_station
            });
        }

        req.flash('success', `L'arrêt a bien été modifié.`);
        return res.status(200).json({ response: "Item updated" });
    });

    /*router.post('/search', csrfProtection, async (req,res) =>{
        try{
            let { count, rows } = await Bus.findAndCountAll({ subQuery: false, include:[
                    { model: Station, as: 'stop', required: true, where:{ nom_station:{ [Op.like]: `%${req.body.searchArret}%` } }},
                    { model: Station, as: 'depart', required: true },
                    { model: Station, as: 'terminus', required: true }
                ], order: [[{ model: Station, as: 'depart' } , 'nom_station', 'ASC']],
                attributes: ['num_ligne'], raw: true });
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ arrets: rows, count, csrfToken: req.csrfToken() }));
            //res.render('arrets', { arrets: rows, count, csrfToken: req.csrfToken() })
        } catch(err){
            throw new Error(err);
        }
    });*/

    return router;
};