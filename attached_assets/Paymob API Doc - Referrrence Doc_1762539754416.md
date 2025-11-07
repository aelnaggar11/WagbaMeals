---

### **1\. Auth for Subscriptions**

**Authentication (Generate Token)**  
 `https://developers.paymob.com/egypt/subscriptions/authentication-request-generate-token` ([Paymob Developer Portal](https://developers.paymob.com/egypt/subscriptions/authentication-request-generate-token))

👉 From this page I need you to copy for me:

* The **Request URL** (path after the domain, e.g. `/v1/...`)

  https://accept.paymob.com/api/auth/tokens

* The **HTTP method** (POST, etc.)

  POST

* A **sample request** and a **sample response**, if shown

  Request body in [Node.JS](http://Node.JS)

  var myHeaders \= new Headers(); myHeaders.append("Content-Type", "application/json"); var raw \= JSON.stringify({ "api\_key": "ZXlKaGJHY2lPaUpJVXpVexxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }); var requestOptions \= { method: 'POST', headers: myHeaders, body: raw, redirect: 'follow' }; fetch("https://accept.paymob.com/api/auth/tokens", requestOptions) .then(response \=\> response.text()) .then(result \=\> console.log(result)) .catch(error \=\> console.log('error', error));

  Response in node JS

  { "profile": { "id": 106, "user": { "id": 211, "username": "5xxxxxxx", "first\_name": "Amxxxxx", "last\_name": "Asxxxxxx", "date\_joined": "2023-04-14T03:30:26+04:00", "email": "axxxxxxxxxxxxxxxxxx.03@gmail.com", "is\_active": true, "is\_staff": false, "is\_superuser": false, "last\_login": null, "groups": \[\], "user\_permissions": \[ 875, 861, 869, 850, 880, 862, 876, 865, 884, 855, 872, 854, 877, 867, 887, 859, 902, 901, 860, 893, 883, 871, 882, 851, 863, 879, 866, 885, 856, 874, 870, 994, 1491, 881, 853, 864, 878, 868, 886, 873, 857, 858, 1961, 852, 440 \] }, "created\_at": "2023-04-14T03:30:26.562808+04:00", "active": true, "profile\_type": "Merchant", "phones": \[ "105xxxxxxxx" \], "company\_emails": \[ "axxxxxxx@gmail.com" \], "company\_name": "Retro", "state": "", "country": "ARE", "city": "temp", "postal\_code": "", "street": "", "email\_notification": true, "order\_retrieval\_endpoint": null, "delivery\_update\_endpoint": null, "logo\_url": null, "is\_mobadra": false, "sector": null, "is\_2fa\_enabled": false, "otp\_sent\_to": "56xxxxx8", "activation\_method": 1, "signed\_up\_through": null, "failed\_attempts": null, "custom\_export\_columns": \[\], "server\_IP": \[\], "username": null, "primary\_phone\_number": "+9715xxxxxxxx", "primary\_phone\_verified": true, "is\_temp\_password": false, "otp\_2fa\_sent\_at": null, "otp\_2fa\_attempt": null, "otp\_sent\_at": "2023-04-14T03:30:32.788498+04:00", "otp\_validated\_at": "2023-04-14T03:32:24.616763+04:00", "awb\_banner": null, "email\_banner": null, "identification\_number": null, "delivery\_status\_callback": "", "merchant\_external\_link": null, "merchant\_status": null, "deactivated\_by\_bank": false, "bank\_deactivation\_reason": null, "bank\_merchant\_status": null, "national\_id": null, "super\_agent": null, "wallet\_limit\_profile": null, "address": null, "commercial\_registration": null, "commercial\_registration\_area": null, "distributor\_code": null, "distributor\_branch\_code": null, "allow\_terminal\_order\_id": false, "allow\_encryption\_bypass": false, "wallet\_phone\_number": null, "suspicious": null, "latitude": null, "longitude": null, "bank\_staffs": {}, "bank\_rejection\_reason": null, "bank\_received\_documents": false, "bank\_merchant\_digital\_status": null, "bank\_digital\_rejection\_reason": null, "filled\_business\_data": true, "day\_start\_time": "00:00:00", "day\_end\_time": null, "withhold\_transfers": false, "manual\_settlement": false, "sms\_sender\_name": "PayMob", "withhold\_transfers\_reason": null, "withhold\_transfers\_notes": null, "can\_bill\_deposit\_with\_card": false, "can\_topup\_merchants": false, "topup\_transfer\_id": null, "referral\_eligible": false, "is\_eligible\_to\_be\_ranger": false, "is\_ranger": false, "is\_poaching": false, "paymob\_app\_merchant": false, "settlement\_frequency": null, "day\_of\_the\_week": null, "day\_of\_the\_month": null, "allow\_transaction\_notifications": true, "allow\_transfer\_notifications": true, "sallefny\_amount\_whole": null, "sallefny\_fees\_whole": null, "paymob\_app\_first\_login": "2023-12-18T22:02:21.736025+04:00", "paymob\_app\_last\_activity": "2024-09-17T15:59:14.950682+04:00", "payout\_enabled": false, "payout\_terms": false, "is\_bills\_new": false, "can\_process\_multiple\_refunds": false, "settlement\_classification": null, "instant\_settlement\_enabled": false, "instant\_settlement\_transaction\_otp\_verified": false, "preferred\_language": "ar", "ignore\_flash\_callbacks": false, "acq\_partner": null, "dom": null, "bank\_related": null, "permissions": \[\] }, "token": "ZXlKaGJHY2lPaUpJVXpVeE1pxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxamc=" }

---

### **2\. Create a Subscription Plan**

**Create Subscription plan**  
 `https://developers.paymob.com/egypt/subscriptions/create-subscription-plan` ([Paymob Developer Portal](https://developers.paymob.com/egypt/subscriptions/create-subscription-plan))

From here I need:

* The **Request URL** (path)

  **https://accept.paymob.com/api/acceptance/subscription-plans**

* Required **JSON body** fields for creating a plan  
   (amount, interval, interval\_count, currency, plan name, etc.)

  var myHeaders \= new Headers(); myHeaders.append("Content-Type", "application/json"); var raw \= JSON.stringify({ "frequency": 7, "name": "Testplan 3", "webhook\_url": "https://webhook.site/xxxxxxxxxxxxxxxxxxxx", "reminder\_days": null, "retrial\_days": null, "plan\_type": "rent", "number\_of\_deductions": null, "amount\_cents": 50000, "use\_transaction\_amount": true, "is\_active": true, "integration": 11111, "fee": null }); var requestOptions \= { method: 'POST', headers: myHeaders, body: raw, redirect: 'follow' }; fetch("https://accept.paymob.com/api/acceptance/subscription-plans", requestOptions) .then(response \=\> response.text()) .then(result \=\> console.log(result)) .catch(error \=\> console.log('error', error));

* Any **response fields** that give the plan ID

  { "id": 127, "frequency": 7, "created\_at": "2024-09-20T18:07:56.185164+04:00", "updated\_at": "2024-09-20T18:07:56.185201+04:00", "name": "Testplan 3", "reminder\_days": null, "retrial\_days": null, "plan\_type": "rent", "number\_of\_deductions": null, "amount\_cents": 50000, "use\_transaction\_amount": true, "is\_active": true, "webhook\_url": "https://webhook.site/xxxxxxxxxxxxxxxxxxxxxxxxxxxx", "integration": 50428, "fee": null }

---

### **3\. Create a Subscription (attach customer/card to plan)**

**Create Subscriptions**  
 `https://developers.paymob.com/egypt/subscriptions/create-subscriptions` ([Paymob Developer Portal](https://developers.paymob.com/egypt/subscriptions/create-subscriptions))

From here I need:

* Request URL: **https://accpet.paymob.com/v1/intention/**

* All **body fields**:

  * how you pass the **plan id**

  * how you pass the **card/customer token**

  * any **customer info** fields

Request Body in [Node.js](http://Node.js)

var myHeaders \= new Headers(); myHeaders.append("Content-Type", "application/json"); var raw \= JSON.stringify({ "frequency": 7, "name": "Testplan 3", "webhook\_url": "https://webhook.site/xxxxxxxxxxxxxxxxxxxx", "reminder\_days": null, "retrial\_days": null, "plan\_type": "rent", "number\_of\_deductions": null, "amount\_cents": 50000, "use\_transaction\_amount": true, "is\_active": true, "integration": 11111, "fee": null }); var requestOptions \= { method: 'POST', headers: myHeaders, body: raw, redirect: 'follow' }; fetch("https://accept.paymob.com/api/acceptance/subscription-plans", requestOptions) .then(response \=\> response.text()) .then(result \=\> console.log(result)) .catch(error \=\> console.log('error', error));

* Response shape: where the **subscription id**, status, next billing date, etc. are returned

{ "id": 127, "frequency": 7, "created\_at": "2024-09-20T18:07:56.185164+04:00", "updated\_at": "2024-09-20T18:07:56.185201+04:00", "name": "Testplan 3", "reminder\_days": null, "retrial\_days": null, "plan\_type": "rent", "number\_of\_deductions": null, "amount\_cents": 50000, "use\_transaction\_amount": true, "is\_active": true, "webhook\_url": "https://webhook.site/xxxxxxxxxxxxxxxxxxxxxxxxxxxx", "integration": 50428, "fee": null }

---

### **4\. Plan-level suspend / resume (optional but nice)**

**Suspend Subscription Plan**  
 `https://developers.paymob.com/egypt/subscriptions/suspend-subscription-plan` ([Paymob Developer Portal](https://developers.paymob.com/egypt/subscriptions/suspend-subscription-plan))

* Request URL: **https://accept.paymob.com/api/acceptance/subscription-plans/{subscription-plan id}/suspend**

* Required body fields (e.g. `plan_id` or whatever they call it)  
  var myHeaders \= new Headers(); myHeaders.append("Content-Type", "application/json"); var requestOptions \= { method: 'POST', headers: myHeaders, redirect: 'follow' }; fetch("https://accept.paymob.com/api/acceptance/subscription-plans/{subscription-plan id}/suspend", requestOptions) .then(response \=\> response.text()) .then(result \=\> console.log(result)) .catch(error \=\> console.log('error', error));  
* Response:  
  { "id": 127, "frequency": 7, "created\_at": "2024-09-20T18:07:56.185164+04:00", "updated\_at": "2024-09-20T18:07:56.185201+04:00", "name": "Testplan 3", "reminder\_days": null, "retrial\_days": null, "plan\_type": "rent", "number\_of\_deductions": null, "amount\_cents": 50000, "use\_transaction\_amount": true, "is\_active": false, "webhook\_url": "https://webhook.site/xxxxxxxxxxxxxxxxxxxxxxxxxxx", "integration": 11111, "fee": null }

* Any notes about allowed statuses or constraints

**Resume Subscription plan**  
 `https://developers.paymob.com/egypt/subscriptions/resume-subscription-plan` ([Paymob Developer Portal](https://developers.paymob.com/egypt/subscriptions/resume-subscription-plan))

* Request URL: **https://accept.paymob.com/api/acceptance/subscription-plans/{subscription-plan id}/resume**

* Required body fields (e.g. `plan_id` or whatever they call it)  
  Request Body:  
  var myHeaders \= new Headers(); myHeaders.append("Content-Type", "application/json"); var requestOptions \= { method: 'POST', headers: myHeaders, redirect: 'follow' }; fetch("https://accept.paymob.com/api/acceptance/subscription-plans/{subscription-plan id}/resume", requestOptions) .then(response \=\> response.text()) .then(result \=\> console.log(result)) .catch(error \=\> console.log('error', error));  
* Response:  
  { "id": 127, "frequency": 7, "created\_at": "2024-09-20T18:07:56.185164+04:00", "updated\_at": "2024-09-20T18:07:56.185201+04:00", "name": "Testplan 3", "reminder\_days": null, "retrial\_days": null, "plan\_type": "rent", "number\_of\_deductions": null, "amount\_cents": 50000, "use\_transaction\_amount": true, "is\_active": true, "webhook\_url": "https://webhook.site/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", "integration": 1111, "fee": null }

* Any notes about allowed statuses or constraints

**Update Subscription plan**  
 [`https://developers.paymob.com/egypt/subscriptions/resume-subscription-plan`](https://developers.paymob.com/egypt/subscriptions/resume-subscription-plan)

* `Request URL: https://accept.paymob.com/api/acceptance/subscription-plans/{subscription-plan id}`  
* `Request Body:`  
  `var myHeaders = new Headers(); myHeaders.append("Content-Type", "application/json"); var raw = JSON.stringify({ "number_of_deductions": 3, "amount_cents": 1000, "integration": 11111 }); var requestOptions = { method: 'PUT', headers: myHeaders, body: raw, redirect: 'follow' }; fetch("https://accept.paymob.com/api/acceptance/subscription-plans/{Subscription_Plan_Id}", requestOptions) .then(response => response.text()) .then(result => console.log(result)) .catch(error => console.log('error', error));`  
* `Response:`   
  `{ "id": 127, "frequency": 7, "created_at": "2024-09-20T18:07:56.185164+04:00", "updated_at": "2024-09-24T17:54:36.669667+04:00", "name": "Testplan 3", "reminder_days": null, "retrial_days": null, "plan_type": "rent", "number_of_deductions": 3, "amount_cents": 1000, "use_transaction_amount": true, "is_active": true, "webhook_url": "https://webhook.site/xxxxxxxxxxxxxxxxxxxxxxxxxxxx", "integration": 11111, "fee": null }`

---

### **5\. Subscription-level suspend / resume / cancel**

These are the ones we’ll definitely use to let users manage their own meal subscriptions:

**Suspend Subscription**  
 `https://developers.paymob.com/egypt/subscriptions/suspend-subscription` ([Paymob Developer Portal](https://developers.paymob.com/egypt/subscriptions/suspend-subscription))

* Request URL: **https://accept.paymob.com/api/acceptance/subscriptions/{subscription- id}/suspend**

* HTTP method: *POST*

* Exact **body fields** (especially the subscription identifier field name)

  var myHeaders \= new Headers(); myHeaders.append("Content-Type", "application/json"); var requestOptions \= { method: 'POST', headers: myHeaders, redirect: 'follow' }; fetch("https://accept.paymob.com/api/acceptance/subscriptions/{subscription- id}/suspend", requestOptions) .then(response \=\> response.text()) .then(result \=\> console.log(result)) .catch(error \=\> console.log('error', error));

* Example request/response if available  
  { "id": 356, "client\_info": { "email": "xxxxxxx@gmail.com", "full\_name": "xxxxxxxxxxxxxxxx", "phone\_number": "xxxxxxxxxxxxxxxxx" }, "frequency": 7, "created\_at": "2024-09-20T22:07:42.889277+04:00", "updated\_at": "2024-09-20T22:07:42.889342+04:00", "name": "Testplan 3", "reminder\_days": null, "retrial\_days": null, "plan\_id": 127, "state": "active", "amount\_cents": 50000, "starts\_at": "2024-09-25", "next\_billing": "2024-09-25", "reminder\_date": null, "ends\_at": null, "resumed\_at": "2024-09-23", "suspended\_at": "2024-09-23", "webhook\_url": "https://webhook.site/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", "integration": 50428, "initial\_transaction": 540326 }

**Resume Subscription**  
 `https://developers.paymob.com/egypt/subscriptions/resume-subscription` ([Paymob Developer Portal](https://developers.paymob.com/egypt/subscriptions/resume-subscription))

* Request URL: **https://accept.paymob.com/api/acceptance/subscriptions/{subscription- id}/resume**

* HTTP method: *POST*

* Exact **body fields** (especially the subscription identifier field name)

  var myHeaders \= new Headers(); myHeaders.append("Content-Type", "application/json"); var requestOptions \= { method: 'POST', headers: myHeaders, redirect: 'follow' }; fetch("https://accept.paymob.com/api/acceptance/subscriptions/{Subscription\_id}/resume", requestOptions) .then(response \=\> response.text()) .then(result \=\> console.log(result)) .catch(error \=\> console.log('error', error));

* Example response if available:  
  { "id": 356, "client\_info": { "email": "xxxxxxx@gmail.com", "full\_name": "xxxxxxxxxxxxxxxx", "phone\_number": "xxxxxxxxxxxxxxxxx" }, "frequency": 7, "created\_at": "2024-09-20T22:07:42.889277+04:00", "updated\_at": "2024-09-20T22:07:42.889342+04:00", "name": "Testplan 3", "reminder\_days": null, "retrial\_days": null, "plan\_id": 127, "state": "active", "amount\_cents": 50000, "starts\_at": "2024-09-25", "next\_billing": "2024-09-25", "reminder\_date": null, "ends\_at": null, "resumed\_at": "2024-09-23", "suspended\_at": "2024-09-23", "webhook\_url": "https://webhook.site/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", "integration": 50428, "initial\_transaction": 540326 }

**Cancel Subscription**  
 `https://developers.paymob.com/egypt/subscriptions/cancel-subscription` ([Paymob Developer Portal](https://developers.paymob.com/egypt/subscriptions/cancel-subscription))

* Request URL: **https://accept.paymob.com/api/acceptance/subscriptions/{subscription- id}/cancel**

* HTTP method: *POST*

* Exact **body fields** (especially the subscription identifier field name):

  var myHeaders \= new Headers(); myHeaders.append("Content-Type", "application/json"); var requestOptions \= { method: 'POST', headers: myHeaders, redirect: 'follow' }; fetch("https://accept.paymob.com/api/acceptance/subscriptions/{Subscription\_id}/cancel", requestOptions) .then(response \=\> response.text()) .then(result \=\> console.log(result)) .catch(error \=\> console.log('error', error));

* Example response if available

  { "id": 3, "client\_info": { "full\_name": "Clifford Nicolas", "email": "claudette09@exa.com", "phone\_number": "+86(8)9135210487" }, "frequency": 7, "created\_at": "2023-11-28T14:44:53.587174", "updated\_at": "2023-11-28T14:44:53.587191", "name": "Test Subscription", "reminder\_days": 3, "retrial\_days": 3, "plan\_id": 3, "state": "canceled", "amount\_cents": 200, "starts\_at": "2023-11-28", "next\_billing": "2023-12-12", "reminder\_date": "2023-12-09", "ends\_at": null, "resumed\_at": "2023-12-05", "suspended\_at": "2023-12-05", "integration": 3381753, "initial\_transaction": 147018623 }

---

### **6\. Webhooks \+ HMAC for Subscriptions**

These are critical so our backend can update subscription status correctly:

**Webhook – New Subscription Plan**  
 `https://developers.paymob.com/egypt/subscriptions/webhook/webhook-new-subscription-plan` ([Paymob Developer Portal](https://developers.paymob.com/egypt/subscriptions/webhook/webhook-new-subscription-plan))

**URL: https://accept.paymob.com/api/acceptance/subscription-plans**

**Method**: *POST*

**Request:**  
var myHeaders \= new Headers(); myHeaders.append("Content-Type", "application/json"); var raw \= JSON.stringify({ "frequency": 7, "name": "Testplan 3", "webhook\_url": "https://webhooksite", "reminder\_days": null, "retrial\_days": null, "plan\_type": "rent", "number\_of\_deductions": null, "amount\_cents": 700, "use\_transaction\_amount": true, "is\_active": true, "integration": 4424012, "fee": null }); var requestOptions \= { method: 'POST', headers: myHeaders, body: raw, redirect: 'follow' }; fetch("https://accept.paymob.com/api/acceptance/subscription-plans", requestOptions) .then(response \=\> response.text()) .then(result \=\> console.log(result)) .catch(error \=\> console.log('error', error));var myHeaders \= new Headers(); myHeaders.append("Content-Type", "application/json"); var raw \= JSON.stringify({ "frequency": 7, "name": "Testplan 3", "webhook\_url": "https://webhooksite", "reminder\_days": null, "retrial\_days": null, "plan\_type": "rent", "number\_of\_deductions": null, "amount\_cents": 700, "use\_transaction\_amount": true, "is\_active": true, "integration": 4424012, "fee": null }); var requestOptions \= { method: 'POST', headers: myHeaders, body: raw, redirect: 'follow' }; fetch("https://accept.paymob.com/api/acceptance/subscription-plans", requestOptions) .then(response \=\> response.text()) .then(result \=\> console.log(result)) .catch(error \=\> console.log('error', error));

**Response:**  
**{ "id": 10, "frequency": 7, "created\_at": "2024-01-15T18:02:03.314636", "updated\_at": "2024-01-15T18:02:03.314656", "name": "Testplan 3", "reminder\_days": null, "retrial\_days": null, "plan\_type": "rent", "number\_of\_deductions": null, "amount\_cents": 700, "use\_transaction\_amount": true, "is\_active": true, "integration": 4424012, "fee": null }**

**Webhook – Existing Subscription (Register Webhook)**  
 `https://developers.paymob.com/egypt/subscriptions/webhook/webhook-existing-subscription-register-webhook` ([Paymob Developer Portal](https://developers.paymob.com/egypt/subscriptions/webhook/webhook-existing-subscription-register-webhook))

URL: [**https://accept.paymob.com/api/acceptance/subscriptions/subID/register\_webhook**](https://accept.paymob.com/api/acceptance/subscriptions/subID/register_webhook)

**Method**: *POST*

**Request:** 

**var myHeaders \= new Headers(); myHeaders.append("Content-Type", "application/json"); var raw \= JSON.stringify({ "url": "https://webhook" }); var requestOptions \= { method: 'POST', headers: myHeaders, body: raw, redirect: 'follow' }; fetch("https://accept.paymob.com/api/acceptance/subscriptions/subID/register\_webhook", requestOptions) .then(response \=\> response.text()) .then(result \=\> console.log(result)) .catch(error \=\> console.log('error', error));**

Response:  
{ "id": 368, "client\_info": { "email": "xxxxxxxxxxxx@gmail.com", "full\_name": "Axxxxxxx", "phone\_number": "+96xxxxxxxxxxx8" }, "frequency": 7, "created\_at": "2024-09-27T10:02:46.440220+04:00", "updated\_at": "2024-09-27T10:02:46.440254+04:00", "name": "Testplan 3", "reminder\_days": null, "retrial\_days": null, "plan\_id": 140, "state": "active", "amount\_cents": 20000, "starts\_at": "2024-09-27", "next\_billing": "2024-10-04", "reminder\_date": null, "ends\_at": null, "resumed\_at": null, "suspended\_at": null, "webhook\_url": "https://webhook.site/f3ab2xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx5", "integration": 50428, "initial\_transaction": 557253 }

**HMAC Calculation for Subscription Callback**  
 `https://developers.paymob.com/egypt/subscriptions/webhook/hmac-calculation-subscription-callbacks` ([Paymob Developer Portal](https://developers.paymob.com/egypt/subscriptions/webhook/hmac-calculation-subscription-callbacks))

From these pages I need:

* The **JSON payload examples** for subscription webhooks  
   (what fields they send us: subscription id, status, event type, etc.)

* How the **HMAC** is calculated:

  * list of fields in order

  * hashing algorithm (usually SHA512)

  * where the HMAC is sent (query param name or header name)

**HMAC Calculation for Subscription Callback**

**Subscription Callback**  
**{**  
  **"paymob\_request\_id": "df9e4ecf-12e0-4925-b258-65423f32bc98",**  
  **"subscription\_data": {**  
    **"id": 1264,**  
    **"client\_info": {**  
      **"email": "test@test.com",**  
      **"full\_name": "mo ay",**  
      **"phone\_number": "01010101010"**  
    **},**  
    **"frequency": 365,**  
    **"created\_at": "2024-12-03T22:11:02.280164",**  
    **"updated\_at": "2024-12-03T22:11:02.280179",**  
    **"name": "Testplan 3",**  
    **"reminder\_days": null,**  
    **"retrial\_days": null,**  
    **"plan\_id": 1186,**  
    **"state": "suspended",**  
    **"amount\_cents": 330,**  
    **"starts\_at": "2024-12-20",**  
    **"next\_billing": "2024-12-20",**  
    **"reminder\_date": null,**  
    **"ends\_at": null,**  
    **"resumed\_at": null,**  
    **"suspended\_at": "2024-12-03",**  
    **"webhook\_url": "https://webhook.site/a16ba9d5-4f4a-47dc-8005-e6ec2d197f26",**  
    **"integration": 4565330,**  
    **"initial\_transaction": 241322967**  
  **},**  
  **"trigger\_type": "suspended",**  
  **"hmac": "dd5b3018888d9f98574cd180793db10d969b522e08c62baf2ea33357d1546b567b7fd79760e90046e90eaacf30024ede5539cbd0748bd9e6c005faf5117e0e7b"**

**}**

### **HMAC Calculation Method**

#### **1.Extract the Relevant Parameters**

* **`subscription_data.id`: Subscription ID (`1264` in the example).**  
* **`trigger_type`: The action taken on the subscription (`suspended` in the example).**

#### **2.Create the Concatenated String**

**The string format is:**

**`”{action}for{subscription_id}”`**

**Example: The string for the above object is “suspendedfor1264“**

#### **3.Hash the String**

* **Use the SHA-512 hashing algorithm.**  
* **Hash the concatenated string using the merchant’s HMAC secret key. (This step is the same as calculating HMAC for normal [callbacks](https://developers.paymob.com/egypt/manage-callback/transaction-callbacks).)**

#### **4.Compare the HMAC**

**Compare the HMAC value sent in the request body (`hmac` parameter) with the calculated HMAC. If they match, the request is authenticated.**

