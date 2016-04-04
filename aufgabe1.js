
var file = "Liste_PPN-ExNr_HSHN-libre.csv";
fs = require('fs');
var datarow = new Array();
fs.readFile(file, 'utf8', function (err, data) {
  if (err) throw err;
  var lines = data.split(/\r?\n/);
  var i = 0;
  
  lines.forEach(function(line) {
	
	lineArr = line.split(',');
	var dataset = new Array();
	if (lineArr.length > 3) {
		var ppn = lineArr[0];
		var datarownum = lineArr[1];
		var signature = lineArr[2];
		var barcode = lineArr[3];
		var sigel = lineArr[4];
		if (ppn.length < 9) {
			for(j = 0; j <= (9 - ppn.length); j++) {
				ppn = "0" + ppn;
			}
		}
		var dataset = {
			["ppn"] : ppn,
			["datarownum"] : datarownum,
			["signature"] : signature,
			["barcode"] : barcode,
			["sigel"] : sigel
		}
		datarow[i] = dataset;
	}
	i++;
  });
  console.log("Anazhl: " + datarow.length);
  var myJsonString = JSON.stringify(datarow);
  
  fs.writeFile("result.txt", myJsonString, function(err) {
		if(err) {
			return console.log(err);
		}

		console.log("The file was saved!");
	}); 
});

 