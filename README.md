<h1 align= "center">Prompt v1.0.0 Guide 🚀🚀🚀</h1>

<h4>Getting everything up and running</h4>
<ol>
  <li>Clone project and run npm install</li>
  <li>Add .env file with following variables</li>
     <ul>
       <li>PORT = 3000</li>
       <li>KEY = "I will provide or you generate one at https://aistudio.google.com/app/apikey"</li>
       <li>MONGO_URL = "I will provide you (mongodb+srv://thebighouse:thebighouse@thebighouse.ipiyiro.mongodb.net/thebighouse)"</li>
     </ul>
  <li>Run development server using npm run dev</li>
  <li>Make a POST request to the /api/get endpoint adding a query key to the request body and for instance users as the values to test</li>
  {
    "query":"users or channels"
  }
</ol>
