const Sequalize = require('sequelize');
const db = require('../database/db.js');

module.exports = db.sequelize.define(
    'transaction_ledger',
    {
        txId:{
            type:Sequalize.STRING,
            primaryKey:true,
            autoIncrement: true
            
        },
        recordType:{
            type: Sequalize.STRING,
            allowNull: false
        },
        productType:{
            type:Sequalize.STRING,
            allowNull: false
        },
        oAccount:{
            type:Sequalize.STRING,
            allowNull: false
        },
        oCurrency:{
            type:Sequalize.STRING,
            allowNull: false
        },
        pCurrency:{
            type:Sequalize.STRING,
            allowNull: false
        },
        pDateTime:{
            type:Sequalize.DATE,
            defaultValue: Sequalize.NOW
        },
        receiver:{
            type:Sequalize.STRING,
            allowNull: false
        },
        rAccount:{
            type:Sequalize.STRING,
            allowNull: false
        },
        swiftCode:{
            type:Sequalize.STRING,
            allowNull: false
        },
        amount:{
            type:Sequalize.STRING,
            allowNull: false
        },
        txCode:{
            type:Sequalize.STRING,
            allowNull: false
        },
        pPurpose:{
            type:Sequalize.STRING,
            allowNull: false
        },
        deliveryMode:{
            type:Sequalize.STRING,
        },
        eEmail:{
            type:Sequalize.STRING
        },
        invoiceDetail:{
            type:Sequalize.STRING,
        },
        txStatus:{
            type:Sequalize.TINYINT,
            allowNull: false
        }
    },
    {
        timestamps:false,
        freezeTableName:true
    }
);