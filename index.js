import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import stripe from "stripe";
import cors from "cors";
import { response } from "express";

dotenv.config();
const app = express();

const Stripe = stripe(process.env.STRIPE_KEY)

const PORT = process.env.PORT;

const MONGO_URL = process.env.MONGO_URL;
async function createConnection() {
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    console.log("mongo is connected");
    return client;
}
const client = await createConnection();

app.use(express.json()); //middleWare
app.use(cors());

   // homePage details
app.get("/",async(req,res)=>{

  
    // //  query for entire categories in home
    // const homeCategories = await HomeCategories();

    //      //for home page best - sellers
    // const bestSellers = await BestSellers();

    //       //for homePage new Arrivals
    // const newArrivals  = await NewArrivals();

    //       //for homePage - award winners
    // const awardWinners = await AwardWinners();
           
    //       //for homePage - staff Picks
    // const staffPicks = await StaffPicks();    
    
    try{

        const [homeCategories,bestSellers,newArrivals,awardWinners,staffPicks] = await 
             Promise.all([HomeCategories(),BestSellers(),NewArrivals(),AwardWinners(),StaffPicks()]);
        
        if(homeCategories && bestSellers && newArrivals && newArrivals && awardWinners && staffPicks){
            res.send({homeCategories:homeCategories,
                bestSellers:bestSellers,
                newArrivals:newArrivals,
                awardWinners:awardWinners,
                staffPicks:staffPicks
               });
            }else{
                res.status(500).send({message:"server error"});
            }
    }
    catch(e){
         console.log("error in getting homepage details",e.message);
         response.status(500).send({message:e.message});
    }

                //query for authors
      //const groups = await client.db("userDB").collection("books").aggregate([{$unwind:"$authors"},{$group:{_id:"$authors",titles:{$push:"$title"},count:{$sum:1}}}]).toArray();
     // let length1 =  groups.filter(x=>x.count > 1);


   
                  //query for search 
     //const search = await client.db("userDB").collection("books").find({title:{$regex:new RegExp("Java")}}).toArray();



    // const order = await client.db("userDB").collection("books").find( { title: { $in: [/^The/,/^Java/,/^Microsoft/] } } ).toArray();
    // res.send(order);

  
             // query for specific category
    // const order = await client.db("userDB").collection("books").find({categories:"Theory"}).toArray();
    // res.send({list:order,length:order.length});
  
 })

   // on-typing
 app.get("/search",async(req,res)=>{
     const query = req.query;
     let search = [];
     if(query.authors){

        search = await client.db("userDB")
                             .collection("books")
                             .aggregate([{$unwind:'$authors'},{$match:{authors:{$regex:`${query.authors}`,$options:"i"}}},{$group:{_id:'$authors'}}])
                             .sort({_id: 1})
                             .toArray();

     }
     if(query.title){

        search = await client.db("userDB")
                             .collection("books")
                             .aggregate([{$match:{title:{$regex:`${query.title}`,$options:"i"}}},{$group:{_id:'$title'}}])
                             .sort({_id:1})
                             .toArray();

     }
     if(query.categories){

        search = await client.db("userDB")
                             .collection("books")
                             .aggregate([{$unwind:'$categories'},{$match:{categories:{$regex:`${query.categories}`,$options:"i"}}},{$group:{_id:'$categories'}}])
                             .sort({_id:1})
                             .toArray();

     }
     if(query.isbn){
        // query.isbn = +query.isbn;
        search = await client.db("userDB")
                             .collection("books")
                             .aggregate([{$match:{isbn:{$regex:`${query.isbn}`,$options:"i"}}},{$group:{_id:"$isbn"}}])
                             .sort({_id:1})
                             .toArray();
     }

     if(search){
       
       return res.send({result:search.map((result)=>result._id)});
     }
 });

   // for getting search results
app.get("/getResult",async(req,res)=>{

try{
    const query = req.query;

    let aggregateQuery;
    let sortQuery;
    let filterQuery = {};

    if(query.price){
        filterQuery.price = {$lte:+query.price}
    }
    if(query.publishedYear){
        filterQuery.publishedYear = +query.publishedYear
    }
    if(query.language){
        filterQuery.language = query.language;
    }


    const Queries = {
                      authors:[{$unwind:'$authors'},{$match:{authors:{$regex:`${query?.authors}`,$options:"i"},...filterQuery}}],
                      title:[{$match:{title:{$regex:`${query?.title}`,$options:"i"},...filterQuery}}],
                      categories:[{$unwind:'$categories'},{$match:{categories:{$regex:`${query?.categories}`,$options:"i"},...filterQuery}}],
                      isbn:[{$match:{isbn:{$regex:`${query?.isbn}`,$options:"i"},...filterQuery}}]
                    }

    if(query.authors){

         aggregateQuery = Queries.authors;
         sortQuery = {authors:1}

    }
    if(query.title){

         aggregateQuery = Queries.title;
         sortQuery = {title:1}

    }
    if(query.categories){

         aggregateQuery = Queries.categories;
         sortQuery = {categories:1}

    }
    if(query.isbn){

         aggregateQuery = Queries.isbn;
         sortQuery = {isbn:1};

    }

    if(query.price){
        sortQuery = {price:-1}
    }

    

   const search = await client.db("userDB")
                              .collection("books")
                              .aggregate(aggregateQuery)
                              .sort(sortQuery)
                              .toArray();
    // console.log(search);
    if(search){
       return res.send({result:search});
    }
    else{
        return res.status(500).send({message:"server error"});
    }

}catch(e){
     console.log("error at getResult", e.message);
     return res.status(500).send({message:"server error"});
}
    
});

   // for creating anonymous User
 app.get("/anonymousUserCreation",async (req, res)=>{

    function randomStr(){
        const arr = "123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
        let ans = '';
        for (var i = 10; i > 0; i--) {
            ans += 
              arr[Math.floor(Math.random() * arr.length)];
        }
        return ans;
      }
    
    // console.log("yes");
    const creationTime =  Date.now();
    const anonymousUserName =  randomStr();

try{
    const anonymousUserCreation = await client.db("userDB")
                                              .collection("booksStoreAnonymousUsers")
                                              .insertOne({anonymousUserName,creationTime,cart:{}});


    if(anonymousUserCreation){
         const anonymousUser = await client.db("userDB")
                                           .collection("booksStoreAnonymousUsers")
                                           .findOne({creationTime,anonymousUserName});
         if(anonymousUser){
            //  console.log(anonymousUser._id);
             return res.send({id: anonymousUser._id,cart: anonymousUser.cart});
         }
         else{
             return res.status(500).send({message:"server error"});
         }
    }
    else{
        return res.status(500).send({message:"server error"});
    }
}catch(e){
    console.log("error at anonymousUser Creation",e.message);
    return res.status(500).send({message:"server error"});
}

});

   // for getting product details with ids in cart
app.post("/cartItems",async(req, res)=>{
   
  const cartItems = req.body;
  const cartItemsIds = Object.keys(cartItems).map((item)=>ObjectId(item));

  try{
      const Items = await client.db("userDB")
                                .collection("books")
                                .find({_id:{$in:cartItemsIds}})
                                .toArray();
     
                                
      if(Items){
          return res.send({result:Items});
      }else{
          return res.status(500).send({message:"Server Error"});
      }
  }catch(e){
    console.log("error at getting cart Items",e.message);
    return res.status(500).send({message:"server error"});
  }


});

   // for signing up new user
app.post("/signup",async(req,res)=>{
    
    const newUser = req.body;

    const {email,userName, password,confirm_password} = newUser;

    if(!email || !userName || !password || !confirm_password){
        return res.status(400).send({message:"kindly provide all the necessary details"});
    }

    const regex = {email:"^[a-z0-9._%+-]+@[a-z0-9.-]+.[a-z]{2,4}$",
                   password:"^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$",
                   userName:"^[a-zA-Z0-9@#]{4,16}$"
                  };

    if(email){

        if(!new RegExp(regex.email).test(email)){
            return res.status(400).send({message:"email is not valid"});
        }

         const existingUser = await client.db("userDB")
                                          .collection("booksStoreAccountUsers")
                                          .findOne({email: email});
         if(existingUser){
              return res.status(400).send({message:"user already exists"});
         }
    }
    
    if(userName){
        if(!new RegExp(regex.userName).test(userName)){
            return res.status(400).send({message:"userName is not valid"});
        }
    }

    if(password && confirm_password){

        if(!new RegExp(regex.password).test(password)){
            return res.status(400).send({message:"password is not in required format"});
        }

         if(password !== confirm_password){
             return res.status(400).send({message:"Passwords mismatch"});
         }

    }

 try{
      newUser.password = await genPassword(password);

      delete newUser.confirm_password;

      const userRegistration = await client.db("userDB")
                                           .collection("booksStoreAccountUsers")
                                           .insertOne({...newUser,cart:{},recentOrder:{},orders:[]});

      if(userRegistration){
           return res.status(200).send({message:"successfully registered"});
      }
      else{
           return res.status(500).send({message:"server error"});
      }

    }catch(e){
        console.log("error at signup",e.message);
        return res.status(500).send({message:"server error"});
    }

})

   // for logging in existing user
app.post("/login",async(req, res)=>{

    const {email,password} = req.body;
  
    if(!email || !password){
        return res.status(400).send({message:"Invalid credentials"});
    }
    try{

        const existingUser = await client.db("userDB")
                                         .collection("booksStoreAccountUsers")
                                         .findOne({email:email})

        // console.log("found user",existingUser);
        if(existingUser){

            const passwordMatch = await bcrypt.compare(password,existingUser.password);

            if (!passwordMatch) {

                return res.status(406).send({message:"invalid credentials"});

            }
            const token = jwt.sign({ _id: existingUser._id }, process.env.SECRET_ADMIN_KEY);

            return res.send({token,userName:existingUser.userName,cart:existingUser.cart});

        }else{

            return res.status(500).send({message:"server error"})
        }

    }
    catch(e){
        
        console.log("error at login",e.message);
        return res.status(500).send({message:"server error"})
         
    }

})

   // checking whether the user exists
app.get("/userCheck", async(req, res) => {

    try{
         const accountUserToken = req.header("accountUser");

         if(accountUserToken){

             const accountUserId = await tokenVerification(accountUserToken);
             
             if(accountUserId){

                   const accountUser = await client.db("userDB")
                                                   .collection("booksStoreAccountUsers")
                                                   .findOne({_id:ObjectId(accountUserId)});

                   if(accountUser){
                        
                         return res.send({message:"valid User"});
                   }
                   else{
                        return res.status(404).send({message:"not a valid user"});
                   }
                 
             }
             else{
                 return res.status(404).send({message:"not a valid user"});
             }
         }
         else{
             return res.status(500).send({message:"server error"});
         }

    }catch(e){
        console.log("error at userCheck",e.message);
        return res.status(500).send({message:"server error"});
    }

})

   // to get and set the cart details of the user in browser
app.get("/settingCart",async (req, res)=>{

    const anonymousUserId =  req.header("anonymousUser");
    const accountUserToken = req.header("accountUser");

try{
    if(anonymousUserId){

         const anonymousUser = await client.db("userDB")
                                           .collection("booksStoreAnonymousUsers")
                                           .findOne({_id:ObjectId(anonymousUserId)});

         if(anonymousUser){
              return res.send({cart:anonymousUser.cart});
         }
         else{
             return res.status(500).send({message:"server error"});
         }
    }
    else if (accountUserToken){

        const accountUserId = await tokenVerification(accountUserToken);

         if(accountUserId){
                 const accountUser = await client.db("userDB")
                                                 .collection("booksStoreAccountUsers")
                                                 .findOne({_id:ObjectId(accountUserId)});
        
                 if(accountUser){
                      return res.send({cart:accountUser.cart});
                 }
                 else{
                     return res.status(500).send({message:"server error"});
                 }
         }
         else{
             return res.status(500).send({message:"server error"});
         }
    }
    else{
        return res.status(500).send({message:"server error"});
    }
}catch(e){
    
    console.log("error at getting cartDetails of  user",e.message);
    return res.status(500).send({message:"server error"});

}

});

   // for updating cart of the user
app.post("/cartUpdate",async (req,res)=>{

    try{
        const anonymousUserId =  req.header("anonymousUser");
        const accountUserToken = req.header("accountUser");
        const cart = req.body;

        if(anonymousUserId){
             
            const cartUpdate = await  client.db("userDB")
                                            .collection("booksStoreAnonymousUsers")
                                            .updateOne({_id:ObjectId(anonymousUserId)},{$set:{cart}},{upsert:true});

            if(cartUpdate){

                const updatedCart = await client.db("userDB")
                                           .collection("booksStoreAnonymousUsers")
                                           .findOne({_id:ObjectId(anonymousUserId)});
                if(updatedCart){
                   return res.send({cart:updatedCart.cart});
                }else{
                    return res.status(500).send({message:"server error"});
                }
            }else{
                return res.status(500).send({message:"server error"});
            }

        }

        else if(accountUserToken){

            const accountUserId = await tokenVerification(accountUserToken); 
            //  console.log(accountUserId)
            if(accountUserId){
                  
                   const cartUpdate = await  client.db("userDB")
                                                   .collection("booksStoreAccountUsers")
                                                   .updateOne({_id:ObjectId(accountUserId)},{$set:{cart:cart}},{upsert:true});
                     if(cartUpdate){
         
                         const updatedCart = await client.db("userDB")
                                                    .collection("booksStoreAccountUsers")
                                                    .findOne({_id:ObjectId(accountUserId)});
                         if(updatedCart){
                            return res.send({cart:updatedCart.cart});
                         }else{
                             return res.status(500).send({message:"server error"});
                         }
                     }else{
                         return res.status(500).send({message:"server error"});
                     }
            }
            else{
                 return res.status(500).send({message:"server error"});
            }

        }
        else{
            return res.status(500).send({message:"server error"});
        }
    }
    catch(e){
        console.log("error at cartUpdate",e.message);
        return res.status(500).send({message:"server error"});
    }

});

   // for shwoing user account details
app.get("/account",async(req, res)=>{

    try{
        const accountUserToken = req.header("accountUser");

        if(accountUserToken){

            const accountUserId = await tokenVerification(accountUserToken);
            
            if(accountUserId){

                  const accountUser = await client.db("userDB")
                                                  .collection("booksStoreAccountUsers")
                                                  .findOne({_id:ObjectId(accountUserId)});

                  if(accountUser){
                       
                        return res.send(accountUser);
                  }
                  else{
                       return res.status(404).send({message:"not a valid user"});
                  }
                
            }
            else{
                return res.status(404).send({message:"not a valid user"});
            }
        }
        else{
            return res.status(500).send({message:"server error"});
        }

   }catch(e){
       console.log("error at userCheck",e.message);
       return res.status(500).send({message:"server error"});
   }


});

app.post('/create-checkout-session', async (req, res) => {

    const accountUserToken = req.header("accountUser");
    const {checkOutItems,totalQuantity,totalPrice} = req.body;

   try{
    const accountUserId = await tokenVerification(accountUserToken);

    if(accountUserId){

         const time = new Date(Date.now());

         const recentOrder = {items:checkOutItems,totalQuantity,totalPrice,status:"pending",time};
           
         const accountUpdate = await client.db("userDB")
                                           .collection("booksStoreAccountUsers")
                                           .updateOne({_id: ObjectId(accountUserId)},
                                                      {$set:{recentOrder}});

            // console.log(accountUpdate);

             if(accountUpdate){
                
                const session = await Stripe.checkout.sessions.create({
                    line_items: [
                      {
                        price_data: {
                          currency: 'inr',
                          product_data: {
                            name: 'Books from RV-Cart',
                          },
                          unit_amount: totalPrice * 100,
                        },
                        quantity: 1,
                      },
                    ],
                    mode: 'payment',
                    success_url: `${process.env.client_url}/payment-success`,
                    cancel_url: `${process.env.client_url}/payment-cancelled`,
                  });
                if(session){
                    return res.send({url:session.url});
                }
             }
             return res.status(400).send({message:"server error , please try again later"});
        }
     return res.status(400).send({message:"couldn't verify user , please try again later"});

   }catch(e){

      console.log("error at checkout",e.message);
      return res.status(500).send({message:"server error , please try again later"});

   }

  });

app.post("/payment-status",async(req, res)=>{

    const accountUserToken = req.header("accountUser");
    const status = (req.body.status) ?"Completed" : "Cancelled";

    try{
        if(accountUserToken){

            const accountUserId = await tokenVerification(accountUserToken);
            
            if(accountUserId){

                  const accountUser = await client.db("userDB")
                                                  .collection("booksStoreAccountUsers")
                                                  .findOne({_id:ObjectId(accountUserId)});

                  if(accountUser){

                       const recentOrder = accountUser.recentOrder;

                        recentOrder.status = status;

                       let accountUserUpdate ;
                       if(recentOrder.status === "Completed"){
                              
                              accountUserUpdate = await client.db("userDB")
                                                                   .collection("booksStoreAccountUsers")
                                                                   .updateOne({_id:ObjectId(accountUserId)},
                                                                             {$set:{recentOrder},$push:{orders:recentOrder}})
                       }
                       else if(recentOrder.status === "Cancelled"){
                              
                        accountUserUpdate = await client.db("userDB")
                                                             .collection("booksStoreAccountUsers")
                                                             .updateOne({_id:ObjectId(accountUserId)},
                                                                       {$set:{recentOrder}});
                       }

                       if(accountUserUpdate){
                            return res.send({message:"updated the status"});
                       }
                       else{
                           return res.status(500).send({message:"error while updating the status"});
                       }
                       
                  }else{
                      return res.status(404).send({message:"couldn't recognize the user"});
                  }
            
            }
            else{
                return res.status(404).send({message:"not a valid user"});
            }
        }
        else{
            return res.status(404).send({message:"not a valid user"});
        }
    }
    catch(e){
         console.log("error while updating payment status", e.message);
         return res.status(500).send({message:"server error"});
    }


});

   // categories 
 app.get("/:id",async(req,res)=>{
     const param = req.params.id;

    if((param).includes("_")){

         const Book = (param).split("_");
         let query = {};

        const queryObject = {Books:{title:Book[1]},
                             "New Arrivals":{title:Book[1]},
                             "Best Sellers":{title:Book[1]},
                             "Award Winners":{awardWinner: "yes",title:Book[1]},
                             "Staff Picks": { staffPicks: "yes",title:Book[1] },
                             title:{title:Book[1]},
                             isbn:{isbn:Book[1]},
                             authors:{authors:Book[1]},
                             categories:{categories:Book[1]}
                             };

        // if(Book[0] === "Books" || Book[0] === "New Arrivals" || Book[0] === "Best Sellers"){
        //     query = {title:Book[1]};
        // }
        // else if(Book[0] === "Award Winners"){
        //     query = { awardWinner: "yes",title:Book[1] };
        // }
        // else if(Book[0] === "Staff Picks"){
        //     query = { staffPicks: "yes",title:Book[1] };
        // }else{
        //     query = {categories:Book[0],title:Book[1]};
        // }

        if(queryObject[Book[0]] === undefined){
            query = {categories:Book[0],title:Book[1]};
        }else{
            query = queryObject[Book[0]];
        }
        // console.log(query);
        try{
             const specificBook = await client.db("userDB")
                                              .collection("books")
                                              .findOne(query);
             
             if(specificBook){
                return res.send(specificBook);
             }
             if(specificBook === null){
                 return res.status(400).send({message: "No such books"});
             }
             else{
                 console.log(specificBook);
                 return res.status(500).send({message:"server error"});
             }
        }catch(e){
              console.log("error while finding specific book",e.message);
              return res.status(500).send({message:e.message});
        }
    }
   
    else{
        let query = req.query
        let findQuery = {};
        let sortQuery = {};
         
        if(param === "Books"){
            findQuery = {};
        }
        else if(param === "New Arrivals"){
            findQuery = {};
            sortQuery = {publishedDate: -1};
        }
        else if(param === "Best Sellers"){
            findQuery = { soldUnits: { $gt: 100 } };
        }
        else if(param === "Award Winners"){
            findQuery = { awardWinner: "yes" };
        }
        else if(param === "Staff Picks"){
            findQuery = { staffPicks: "yes" };
        }else{
            findQuery = {categories:param};
        }

        if(query.price){
            findQuery.price = { $lte:+query.price}
            sortQuery = {price:-1};
        }
        if(query.publishedYear){
            findQuery.publishedYear = +query.publishedYear
        }
        if(query.language){
            findQuery.language = query.language;
        }

        // console.log(findQuery);
            
     try{
       const specificCategory = await client.db("userDB")
                                            .collection("books")
                                            .find(findQuery)
                                            .sort(sortQuery)
                                            .toArray();
        // console.log(specificCategory);
        if(specificCategory){
          return res.send(specificCategory);
        }
        else{
            return res.status(500).send({message:"server error"});
        }
     }catch(e){
        console.log("error at getting specific category",e.message);
        return res.status(500).send({message:e.message});
     }

    }
  
 });

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


async function StaffPicks() {
    return await client.db("userDB").collection("books")
        .find({ staffPicks: "yes" })
        .project({ _id: 0, title: 1, price: 1, thumbnailUrl: 1 })
        .limit(10)
        .toArray();
}

async function AwardWinners() {
    return await client.db("userDB").collection("books")
        .find({ awardWinner: "yes" })
        .project({ _id: 0, title: 1, price: 1, thumbnailUrl: 1 })
        .limit(10)
        .toArray();
}

async function NewArrivals() {
    return await client.db("userDB").collection("books")
        .find({})
        .sort({ publishedDate: -1 })
        .project({ _id: 0, title: 1, price: 1, thumbnailUrl: 1, publishedDate: 1 })
        .limit(10)
        .toArray();
}

async function BestSellers() {
    return await client.db("userDB").collection("books")
        .find({ soldUnits: { $gt: 100 } })
        .project({ _id: 0, title: 1, price: 1, thumbnailUrl: 1, soldUnits: 1 })
        .sort({ soldUnits: -1 })
        .limit(10)
        .toArray();
}

async function HomeCategories() {
    return await client.db("userDB")
        .collection("books")
        .aggregate([{ $unwind: "$categories" }, { $group: { _id: "$categories", count: { $sum: 1 } } }]).sort({ _id: 1 })
        .toArray();
}

async function genPassword(password) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
};

async function tokenVerification(token){
  let id;
  jwt.verify(token, process.env.SECRET_ADMIN_KEY,async(err,decoded)=>{
               
    id =  decoded._id;
});
  return id;
}


// async function check(){

//     const check1 = await client.db("userDB").collection("books").find({}).sort({publishedYear:1}).project({ _id: 0, publishedYear: 1}).toArray();

//     console.log(check1);

// }

// check();