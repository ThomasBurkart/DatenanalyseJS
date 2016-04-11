// Pfad zur Datei
var inputFile = "Liste_PPN-ExNr_HSHN-libre.csv";
var resultFile = "result.json";
var errorFile = "error.txt";

// Bibliotheken
var fs = require('fs');
var HashMap = require('hashmap');
var md5 = require("crypto-js/md5");
var http = require('http');
var mongodb = require('mongodb');
var mongoose = require('mongoose');
var xml2js = require('xml2js');
var request = require('sync-request');
var async = require('async');

// Connection URL. This is where your mongodb server is running.
var url = 'mongodb://localhost:27017/swb';
mongoose.connect(url);
var Catalog = mongoose.model('catalog', {ppn: String, xml: String});

var dataRow = new HashMap();
var statsSigel = new HashMap();
var statsSignatur = new HashMap();
var statsPpn = new HashMap();
var statsBarcode = new HashMap();
var statsExemplar = new HashMap();
var statsExemplarSum = new HashMap();
var hashCompare = new HashMap();


fs.stat(resultFile, function(err, stat) {
    if (err == null) {

        // result.json vorhanden, also Inhalt wieder einlesen
        var contents = fs.readFileSync(resultFile);

        var jsonContent = JSON.parse(contents);
        for(var index in jsonContent) {
            // Ersten Datensatz ignorieren
            if (index == "_data") {
                continue;
            }

            var exemplar = jsonContent[index];
            setStatisicsFor(exemplar);
            dataRow.set(index, exemplar);
        }

        statsExemplar.forEach(function (value, key) {
            setStatsFor(statsExemplarSum, value);
        });
        // Statistik für vorhandene Datei erneut ausgeben
        statisticOutput();

        // Alle PPN die einmal vorkommen
        var crawlCounter = 0;
        statsPpn.forEach(function (value, ppn) {
            Catalog.findOne({ppn: ppn}, function (err, catalogObj) {
                if (err) {
                    console.log(err);
                } else if (catalogObj) {
                    //console.log('Found:', catalogObj);
                    console.log("PPN ["+ppn+"] bereits in MongoDB");
                } else {
                    crawl(ppn, crawlCounter);
                }
            });
            crawlCounter++;
        });
    } else {
        fs.readFile(inputFile, 'utf8', function (err, data) {
            if (err) throw err;
            var lines = data.split(/\r?\n/);
            var i = 0;
            var quotes = false;
            lines.forEach(function (line) {
                // Header übegehen
                if (i == 0 || line.length == 0) {
                    i++;
                    return;
                }

                lineArr = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

                if (lineArr.length != 5) {
                    writeError("[Zeile " + i + "] Error: Zeile hat weniger als 5 Spalten.\r\n");
                } else {
                    var ppn = lineArr[0];
                    var examplenum = lineArr[1];
                    var signature = lineArr[2];
                    var barcode = lineArr[3];
                    var sigel = lineArr[4];


                    ppn = "0".repeat(9 - ppn.length) + ppn;

                    var exemplar = {
                        ppn: ppn,
                        number: examplenum,
                        signatur: signature,
                        barcode: barcode,
                        sigel: sigel
                    };

                    setStatisicsFor(exemplar);
                    var hash = md5(JSON.stringify(exemplar));
                    if (!dataRow.has(hash)) {
                        dataRow[hash] = exemplar;
                    }

                }

                i++;
            });

            writeResult(JSON.stringify(dataRow, null, 2));

            statsExemplar.forEach(function (value, key) {
                setStatsFor(statsExemplarSum, value);
            });

            statisticOutput();
        });
    }
});

function statisticOutput() {

    console.log("Anzahl Datensätze: " + dataRow.count());
    console.log("---");
    if (dataRow.count() == statsBarcode.count()) {
        console.log("Barcodes sind eindeutig.");
    } else {
        console.log("ACHTUNG: Barcodes sind NICHT eindeutig.");
        var notUniqueBarcode = 0;
        statsBarcode.forEach(function(value, key) {
            if (value > 1) {
               // console.log("Barcode '" + key + "' kommt " + value + " mal vor.");
                writeError("Warning: Barcode '" + key + "' kommt " + value + " mal vor.\r\n");
                notUniqueBarcode += 1;
            }
        });
        console.log("Nicht eindeutige Barcodes Total: " + notUniqueBarcode + " von " + dataRow.count());
    }
    console.log("---");
    if (dataRow.count() == statsExemplar.count()) {
        console.log("Exemplar Nummern sind eindeutig.");
    } else {
        console.log("ACHTUNG: Exemplar Nummern sind NICHT eindeutig.");
        var notUniqueExemplare = 0;
        statsExemplar.forEach(function(value, key) {
            if (value > 1) {
             //   console.log("Exemplar Nummer '" + key + "' kommt " + value + " mal vor.");
                writeError("Warning: Exemplar Nummer '" + key + "' kommt " + value + " mal vor.\r\n");
                notUniqueExemplare += 1;
            }
        });
        console.log("Nicht eindeutige Exemplare Total: " + notUniqueExemplare + " von " + dataRow.count());
    }
    console.log("---");
    var sigelTotal =0;
    statsSigel.forEach(function(value, key){
        console.log("Anzahl Sigel '"+key+"': " + value);
        sigelTotal += value;
    });
    console.log("Sigel Total: " + sigelTotal + " von " + dataRow.count() + " -> " + (sigelTotal==dataRow.count()));
    console.log("---");
    console.log("unterschiedliche PPN: " + statsPpn.count());
    var ppnTotal =0;
    statsPpn.forEach(function(value, key){
        ppnTotal += value;
    });
    console.log("PPN Total: " + ppnTotal + " von " + dataRow.count() + " -> " + (ppnTotal==dataRow.count()));
    console.log("---");
    console.log("unterschiedliche Signaturen: " + statsSignatur.count());
    var sigTotal =0;
    statsSignatur.forEach(function(value, key){
        sigTotal += value;
    });
    console.log("Signatur Total: " + sigTotal + " von " + dataRow.count() + " -> " + (sigTotal==dataRow.count()));
    console.log("---");
    var exemTotal = 0;
    statsExemplarSum.forEach(function(value, key){
        console.log("Anzahl der Zeilen mit '"+key+"' Exemplar(en): " + value);
        exemTotal += (key*value);
    });
    console.log("Exemplare Total: " + exemTotal + " von " + dataRow.count() + " -> " + (exemTotal==dataRow.count()));

    console.log("---");

    var hashCompareTotal = 0;
    var countIdenticalLines = 0;
    hashCompare.forEach(function(value, key){
        if (value > 1) {
            countIdenticalLines += 1;
        }
        hashCompareTotal += 1;
    });
    console.log("Hash Compare Total: " + hashCompareTotal + " von " + dataRow.count() + " -> " + (hashCompareTotal==dataRow.count()));
    if ((hashCompareTotal==dataRow.count())) { console.log("Keine komplett identischen Exemplare in Daten."); } else {

        console.log(countIdenticalLines + " identische Zeilen gefunden.");
    }
}

// Statistik setzen
function setStatisicsFor(exemplar) {

    setStatsFor(statsSigel, exemplar.sigel);
    setStatsFor(statsSignatur, exemplar.signatur);
    setStatsFor(statsPpn, exemplar.ppn);
    setStatsFor(statsBarcode, exemplar.barcode);
    setStatsFor(statsExemplar, exemplar.number);

    var hash = md5(JSON.stringify(exemplar));
    setStatsFor(hashCompare, hash.toString());
}
function setStatsFor(map, value) {
    if (map.has(value)) {
        map.set(value, (map.get(value) + 1))
    } else {
        map.set(value, 1);
    }
}

// Funktion schreibt das Ergebnis in die Ergebnisdatei
function writeResult(result) {
    fs.writeFile(resultFile, result, function (err) {
        if (err) {
            return console.log(err);
        }
        console.log("---");
        console.log("Die Datei '" + resultFile + "' wurde gespeichert!");
    });
}

// Funktion zum Fehler erfassen
function writeError(err) {
    fs.appendFile(errorFile, err, function (err) {
        if (err) {
            return console.log(err);
        }
    });
}

function crawl(ppn, crawlCounter) {
    var link = "http://swb.bsz-bw.de/sru/DB=2.1/username=/password=/?query=pica.ppn+%3D+%\"" + ppn + "\"%22&version=1.1&operation=searchRetrieve&stylesheet=http%3A%2F%2Fswb.bsz-bw.de%2Fsru%2F%3Fxsl%3DsearchRetrieveResponse&recordSchema=marc21&maximumRecords=10&startRecord=1&recordPacking=xml&sortKeys=none&x-info-5-mg-requestGroupings=none";


    async.waterfall([
            function(callback) {
                var res = request('GET', link);
                var catalogObj = new Catalog({ppn: ppn, xml: res.body.toString('utf-8')});
                callback(null, catalogObj);
            },
            function(catalogObj, callback) {
                catalogObj.save(function (err, catalogObj) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('saved successfully'); //, catalogObj);
                    }
                    callback(null)
                });
            },
            function(callback) {
                callback(null, "[" + ppn + "]: " + crawlCounter + " von " + statsPpn.count() + " gecrawlt.");

            }

        ],
        // the bonus final callback function
        function(err, status) {
            console.log(status);
        });
}


