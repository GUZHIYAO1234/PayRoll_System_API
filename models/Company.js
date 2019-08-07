const Sequalize = require('sequelize');
const db = require('../database/db.js');

module.exports = db.sequelize.define(
    'company_accounts',
    {
        company_UEN:{
            type:Sequalize.STRING,
            primaryKey:true,
            allowNull: false
        },
        company_password:{
            type:Sequalize.STRING,
            allowNull: false
        },
        company_email:{
            type:Sequalize.STRING,
            allowNull: false
        },
        company_name:{
            type:Sequalize.STRING,
            allowNull: false
        },
        company_poc_name:{
            type:Sequalize.STRING,
            allowNull: false
        },
        appointment_date:{
            type:Sequalize.DATE,
            allowNull: false
        },
        company_pin:{
            type:Sequalize.STRING,
            allowNull: false
        }
    },
    {
        timestamps:false,
        freezeTableName:true
    }
);
