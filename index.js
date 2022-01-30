import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();
const app = express();

const PORT = process.env.PORT;

const MONGO_URL = process.env.MONGO_URL;
async function createConnection() {
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    console.log("mongo is connected");
    return client;
}
const client = await createConnection();

app.get("/",async(req,res)=>{

  
    //             query for entire categories in home
     const homeCategories = await client.db("userDB")
                          .collection("books")
                          .aggregate([{$unwind:"$categories"},{$group:{_id:"$categories",count:{$sum: 1}}}]).sort({_id: 1})
                          .toArray();

         //for home page best - sellers
    const bestSellers = await client.db("userDB").collection("books")
                               .find({soldUnits:{$gt:100}})
                               .project({_id:0,title:1,price:1,thumbnailUrl:1,soldUnits:1})
                               .sort({soldUnits: -1})
                               .limit(10)
                               .toArray();

          //for homePage new Arrivals
    const newArrivals  = await client.db("userDB").collection("books")
                                     .find({})
                                     .sort({publishedDate: -1})
                                     .project({_id:0,title:1,price:1,thumbnailUrl:1,publishedDate: 1})
                                     .limit(10)
                                     .toArray();

          //for homePage - award winners
    const awardWinners = await client.db("userDB").collection("books")
                                     .find({awardWinner:"yes"})
                                     .project({_id:0,title:1,price:1,thumbnailUrl:1})
                                     .limit(10)
                                     .toArray();
           
          //for homePage - staff Picks
    const staffPicks = await client.db("userDB").collection("books")
                                   .find({staffPicks: "yes"})
                                   .project({_id:0,title: 1,price: 1,thumbnailUrl: 1})
                                   .limit(10)
                                   .toArray();                                 

                //query for authors
      //const groups = await client.db("userDB").collection("books").aggregate([{$unwind:"$authors"},{$group:{_id:"$authors",titles:{$push:"$title"},count:{$sum:1}}}]).toArray();
     // let length1 =  groups.filter(x=>x.count > 1);


   
                  //query for search 
     //const search = await client.db("userDB").collection("books").find({title:{$regex:new RegExp("Java")}}).toArray();

     res.send({home:{homeCategories:homeCategories,
               bestSellers:bestSellers,
               newArrivals:newArrivals,
               awardWinners:awardWinners,
               staffPicks:staffPicks
              }});



    // const order = await client.db("userDB").collection("books").find( { title: { $in: [/^The/,/^Java/,/^Microsoft/] } } ).toArray();
    // res.send(order);

  
             // query for specific category
    // const order = await client.db("userDB").collection("books").find({categories:"Theory"}).toArray();
    // res.send({list:order,length:order.length});

    
 })

        //on-typing
//  app.get("/",async(req,res)=>{
//      const query = req.query;
//      let search = [];
//      if(query.authors){

//         search = await client.db("userDB")
//                              .collection("books")
//                              .aggregate([{$unwind:'$authors'},{$match:{authors:{$regex:`^${query.authors}`,$options:"i"}}},{$group:{_id:'$authors'}}])
//                              .sort({authors: -1})
//                              .toArray();

//      }
//      if(query.title){

//         search = await client.db("userDB")
//                              .collection("books")
//                              .aggregate([{$match:{title:{$regex:`${query.title}`,$options:"i"}}}])
//                              .project({_id:0,title:1})
//                              .sort({title:1})
//                              .toArray();

//      }
//      if(query.isbn){

//         search = await client.db("userDB")
//                              .collection("books")
//                              .aggregate([{$match:{isbn:{$regex:`^${query.isbn}`,$options:"i"}}}])
//                              .project({_id:0,isbn:1})
//                              .sort({isbn:1})
//                              .toArray();

//      }
    
//      res.send({result:search})
//  })

        //categories
 app.get("/:id",async(req,res)=>{
     const param = req.params;
    //  if((param["id"]).includes("&")){
    //      const categories = (param["id"]).split("&");
         //res.send(param);
    // }
      
    const specificCategory = await client.db("userDB").collection("books")
                                         .find({categories:param.id})
                                         .toArray();

     res.send(specificCategory);

 })

        //authors
// app.get("/authors/:id",async(req,res)=>{
//      const params = req.params;
//      const books = await client.db("userDB")
//                                .collection("books")
//                                .find({authors:params.id})
//                                .toArray();

//      res.send(books);
// })


app.listen(PORT,console.log("server started at port, ",PORT));




