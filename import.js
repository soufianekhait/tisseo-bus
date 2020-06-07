const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Op, Sequelize } = require('sequelize');


async function createTables(models) {
    for (const model of Object.values(models)
        .filter(model => typeof model === "function")) {
        try {
            await model.sync({force: true});
        } catch (err){
            throw new Error(err);
        }
        console.log(`La table ${model.name} a été créée`);
    }
}


async function readFile(models, filePath) {
    const output = [];
    //initializes the fs.ReadStream object
    const readStream = fs.createReadStream(filePath)
        //begins to pipe data into our ReadStream, which is now listening for the next two events below
        .pipe(csv({ mapValues: ({ header, value }) => {
            if (header === 'sens')
                return value.split(' - ');
            else
                return value;
        }}))
        //returns each line of the CSV row-by-row, accessible in its callback as data.
        .on('data', (data) => {
            output.push(data);
        });

    const end = new Promise(function(resolve, reject) {
        //listens for the end of the CSV.
        readStream.on('end', () => resolve(output));
        //checks for errors
        readStream.on('error', reject)
    });

    let rawData = await end;
    await formatData(models, rawData);
}


async function formatData(models, rawData) {
    // Object where formatted data is stored
    const formattedData = {};

    // Retrieve all distinctive data about 'Stations"
    const stations = rawData.map(item => {
        if (item.nom_station && item.longitude && item.latitude)
            return {
                nom_station: item.nom_station,
                latitude_station: item.latitude,
                longitude_station: item.longitude
        };
    });
    // The instruction below filter distinctive `nom_station` data
    formattedData.stations = ([...new Map(stations.map(item => [item.nom_station, item])).values()]);

    // Retrieve all distinctive data about 'Lignes"
    const lignes = (rawData.map(item => {
        if (item.ligne && item.sens)
            return {
                num_ligne: item.ligne,
                depart_station: item.sens[0],
                terminus_station: item.sens[1]
            };
        })
    );
    // The instruction below filter distinctive `num_ligne` and `sens` data
    formattedData.lignes = ([...new Map(lignes.map(item => [`${item.num_ligne} ${item.depart_station} ${item.terminus_station}`, item])).values()]);

    // Retrieve all distinctive data about 'Arrêts"
    const arrets = rawData.map(item => {
        if (item.ordre && item.ligne && item.nom_station && item.sens)
            return {
                ordre_arret: item.ordre,
                id_trajet: item.ligne,
                id_station: item.nom_station,
                depart_station: item.sens[0],
                terminus_station: item.sens[1]
            };
        });
    // The instruction below filter distinctive `num_ligne`, `sens` and `nom_station` data
    formattedData.arrets = ([...new Map(arrets.map(item =>
        [`${item.id_trajet} ${item.depart_station} ${item.terminus_station} ${item.id_station}`, item])).values()]);

    await importData(models, formattedData);
}


async function importData(models, formattedData) {
    const {Bus, Station, Arret} = models;

    await Station.bulkCreate(formattedData.stations);
    console.log(`Importation de ${formattedData.stations.length} stations dans la BDD`);

    for (const index in formattedData.lignes){
        if(formattedData.lignes.hasOwnProperty(index)){
            let ligne = formattedData.lignes[index];
            if (ligne.hasOwnProperty('depart_station') && ligne.hasOwnProperty('terminus_station')){
                let depStation = await Station.findOne({where: { nom_station: ligne.depart_station }});
                let terStation = await Station.findOne({where: { nom_station: ligne.terminus_station }});
                await Bus.create({
                    num_ligne: ligne.num_ligne,
                    depart_station: depStation.id_station,
                    terminus_station: terStation.id_station
                });
            }
        }
    }
    console.log(`Importation de ${formattedData.lignes.length} lignes dans la BDD`);

    for (const index in formattedData.arrets){
        if(formattedData.arrets.hasOwnProperty(index)){
            let arret = formattedData.arrets[index];

            if (arret.hasOwnProperty('depart_station') && arret.hasOwnProperty('terminus_station')){
                let depStation = await Station.findOne({ where:
                        { nom_station: arret.depart_station }});
                let terStation = await Station.findOne({ where:
                        { nom_station: arret.terminus_station }});
                let trajet = await Bus.findOne({ where: { [Op.and]: [
                    { depart_station: depStation.id_station }, { terminus_station: terStation.id_station },
                            { num_ligne: arret.id_trajet }]}});
                let station = await Station.findOne({ where: { nom_station: arret.id_station }});

                await Arret.create({
                    ordre_arret: parseInt(arret.ordre_arret),
                    id_trajet: trajet.id_trajet,
                    id_station: station.id_station
                });
            }
        }
    }
    console.log(`Importation de ${formattedData.arrets.length} arrêts dans la BDD`);
}


async function importFile(filePath) {
    // initialisation de la librairie sequelize avec la BDD sqlite
    const sequelize = new Sequelize('sqlite://db/arretbus.db', {logging: false});
    // importation du modèle
    const models = sequelize.import(path.join(__dirname, 'server', 'models.js'));
    await createTables(models);
    await readFile(models, filePath);
    await sequelize.close();
}


importFile(path.join(__dirname, "db", "Arret Bus - Toulouse.csv")).then(
    () => { console.log("Les données ont été importées"); }
).catch(err =>{
    throw new Error(err);
});