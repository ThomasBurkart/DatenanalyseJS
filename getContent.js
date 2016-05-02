
var request = require('sync-request');
var xml2js = require('xml2js');
var Twitter = require('twitter');

var rssFeeds = [
    "http://www.spiegel.de/schlagzeilen/index.rss",
    "http://www.welt.de/?service=Rss",
    "http://rss.focus.de/fol/XML/rss_folnews.xml",
    "http://rss.sueddeutsche.de/app/service/rss/alles/index.rss?output=rss",
    "http://newsfeed.zeit.de/all"
];

var twitterFeeds = [
    "SPIEGELONLINE",
    "welt",
    "focusonline",
    "SZ",
    "zeitonline"
];

var client = new Twitter({
});


for(var i = 0; i < twitterFeeds.length; i++) {

    // Twitter
    var twitterUid = twitterFeeds[i];

    var params = {screen_name: twitterUid, count: 5, trim_user: true};
    //client.get('statuses/user_timeline', params, function (error, tweets, response) {
    //    if (!error) {
    //        console.log(tweets);
    //    }
    //});

    // RSS Feed
    var rssLink = rssFeeds[i];
    console.log("start crawling: " + rssLink);
    var rssContent = crawlFeed(rssLink);
    var xmlContent = xml2js.parseString(rssContent, function (err, result) {
        for (var x = 0; x < result.rss.channel.length; x++) {
            for (var y = 0; y < result.rss.channel[x].title.length; y++) {
                console.log(result.rss.channel[x].title[y]);
            }
            for (var j = 0; j < result.rss.channel[x].item.length && j < 10; j++) {
                var item = result.rss.channel[0].item[j];
                console.log(item.title[0]);
                console.log(item.description[0]);
            }
        }
        console.log('Done');
    });

}


function crawlFeed(link) {
    var res = request('GET', link);
    return res.body.toString('utf-8');
}

