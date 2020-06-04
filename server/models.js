module.exports = (sequelize, DataTypes) => {
    const { Model } = require('sequelize');

    class Bus extends Model {}
    Bus.init({
        id_trajet: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        num_ligne: DataTypes.STRING,
    }, { sequelize, modelName: 'bus', timestamps: false, freezeTableName: true });

    class Station extends Model {}
    Station.init({
        id_station: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        nom_station: { type: DataTypes.STRING, unique: true },
        latitude_station: DataTypes.FLOAT,
        longitude_station: DataTypes.FLOAT,
    }, { sequelize, modelName: 'station', timestamps: false, freezeTableName: true });

    class Arret extends Model {}
    Arret.init({
        ordre_arret: DataTypes.INTEGER,
    }, { sequelize, modelName: 'arret', timestamps: false, freezeTableName: true });


    // Relations entre les modèles
    Bus.belongsTo(Station, { as: 'depart', foreignKey: 'depart_station' });
    Bus.belongsTo(Station, { as: 'terminus', foreignKey: 'terminus_station' });
    Bus.belongsToMany(Station, { as: 'stop', through: Arret, foreignKey: 'id_trajet' });
    Station.belongsToMany(Bus, { as: 'stoppedBy', through: Arret, foreignKey: 'id_station' });

    return { Bus, Station, Arret };
};