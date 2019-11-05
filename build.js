const { readFileSync, writeFileSync } = require('fs');
const { csvParse } = require('d3-dsv');
const { render } = require('nunjucks');
const { timeFormat, timeParse } = require('d3-time-format');
//get the data 

const decorateRow = (row)=>{
    row.readMonth = '';
    row.readYear = '';
    row.ratingClass = '';
    row.pages = Number(row.pages);
    return row;
}

const books = csvParse( readFileSync('reading-list.csv','utf-8'), decorateRow );

//make an html page
writeFileSync('./index.html', render('./templates/index.html', {
    books,
    title: 'Reading list'
}));
//the end
module.exports = {};