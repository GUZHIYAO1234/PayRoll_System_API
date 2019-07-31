const Sequalize = require('sequelize');
const db = require('../database/db.js');

module.exports = db.sequelize.define(
    'employee_information',
    {
        companyId:{
            type:Sequalize.STRING,
            allowNull: false
        },
        eNRIC:{
            type:Sequalize.STRING,
            primaryKey:true,
            allowNull: false
        },
        eId:{
            type:Sequalize.STRING,
            allowNull: false
        },
        eName:{
            type:Sequalize.STRING,
            allowNull: false
        },
        eEmail:{
            type:Sequalize.STRING,
            allowNull: false
        },
        rAccount:{
            type:Sequalize.STRING,
            allowNull: false
        },
        mNumber:{
            type:Sequalize.STRING,
            allowNull: false
        },
        pScheme:{
            type:Sequalize.STRING,
            allowNull: false
        },
        mSalary:{
            type:Sequalize.STRING,
            allowNull: false
        },
        wBalance:{
            type:Sequalize.STRING,
            allowNull: false,
            defaultValue:"0"
        },
        ePassword:{
            type:Sequalize.STRING,
            allowNull: false
        },
        eDateCreated:{
            type: Sequalize.DATE,
            defaultValue: Sequalize.NOW
        }
    },
    {
        timestamps:false,
        freezeTableName:true
    }
);

