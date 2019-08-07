const Sequalize = require('sequelize');
const db = require('../database/db.js');

module.exports = db.sequelize.define(
    'employee_monthly_plan',
    {
        planId:{
            type:Sequalize.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        pDate:{
            type:Sequalize.DATE,
            allowNull: false
        },
        rAccount:{
            type:Sequalize.STRING,
            allowNull: false
        },
        sAllocated:{
            type:Sequalize.STRING,
            allowNull: false
        },
        pStatus:{
            type:Sequalize.TINYINT,
            allowNull: false
        }
    },
    {
        timestamps:false,
        freezeTableName:true
    }
);