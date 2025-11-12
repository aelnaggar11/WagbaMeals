**Subscriptions**

Overview

## Paymob provides a comprehensive subscription module designed to help merchants efficiently manage        their subscriptions on a variety of billing cycles, including weekly, bi-weekly, monthly, quarterly, semi-annual, and annual plans. This module is tailored to meet the specific needs of each merchant, enabling them to create, manage, and control their subscriptions independently through our APIs.

## For any guidance or assistance, please reach out to your account manager. Alternatively, you can contact our support team via email at [support@paymob.com](https://mailto:support@paymob.com/). When reaching out, please include details regarding your subscription, such as your Subscription ID and Transaction ID, to help us assist you more efficiently.

## Integration Requirements

## To successfully set up your subscription plan, you will need two integration IDs:

* **Online 3DS Integration ID:** This ID will be used for creating subscriptions.  
* **Moto Integration ID:** Utilize this ID when creating the subscription plan itself.

Ensure you have both integration IDs ready to streamline the setup process

If you wish to verify the card user details (provide a free trial for X days period) instead of deducting the amount while creating the subscription then you can ask our support team at [support@paymob.com](https://mailto:support@paymob.com/) to create a 3DS verification integration ID. Noting this amount will be an auto reversal and you need to set the  "use\_transaction\_amount": **false**  to avoid any override with the Subscription plan amount

**Authentication Request (Generate Token)**

**Authentication Request API allows you to pass your API key or login details to generate a token in the response.**

**Step 1:** To start using any API for the subscription module, you need to obtain an authentication token through the below auth request using “api\_key” or “login” details.

**URL: https://accept.paymob.com/api/auth/tokens**

**Method:** POST

**Source**: *Merchant's server*

**Recipient**: *Accept's server*

**Step 1.1: API KEY**

You can pass the API key in the parameters to receive the token in the response. 

**Request:**  
**{**

   **"api\_key": ""ZXlKaGJHY2lPaUpJVXpVexxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"" //** 

**}**

**Response(example):**

**{**

  **"profile": {**

    **"id": 106,**

    **"user": {**

      **"id": 211,**

      **"username": "5xxxxxxx",**

      **"first\_name": "Amxxxxx",**

      **"last\_name": "Asxxxxxx",**

      **"date\_joined": "2023-04-14T03:30:26+04:00",**

      **"email": "axxxxxxxxxxxxxxxxxx.03@gmail.com",**

      **"is\_active": true,**

      **"is\_staff": false,**

      **"is\_superuser": false,**

      **"last\_login": null,**

      **"groups": \[\],**

      **"user\_permissions": \[**

        **875,**

        **861,**

        **869,**

        **850,**

        **880,**

        **862,**

        **876,**

        **865,**

        **884,**

        **855,**

        **872,**

        **854,**

        **877,**

        **867,**

        **887,**

        **859,**

        **902,**

        **901,**

        **860,**

        **893,**

        **883,**

        **871,**

        **882,**

        **851,**

        **863,**

        **879,**

        **866,**

        **885,**

        **856,**

        **874,**

        **870,**

        **994,**

        **1491,**

        **881,**

        **853,**

        **864,**

        **878,**

        **868,**

        **886,**

        **873,**

        **857,**

        **858,**

        **1961,**

        **852,**

        **440**

      **\]**

    **},**

    **"created\_at": "2023-04-14T03:30:26.562808+04:00",**

    **"active": true,**

    **"profile\_type": "Merchant",**

    **"phones": \[**

      **"105xxxxxxxx"**

    **\],**

    **"company\_emails": \[**

      **"axxxxxxx@gmail.com"**

    **\],**

    **"company\_name": "Retro",**

    **"state": "",**

    **"country": "ARE",**

    **"city": "temp",**

    **"postal\_code": "",**

    **"street": "",**

    **"email\_notification": true,**

    **"order\_retrieval\_endpoint": null,**

    **"delivery\_update\_endpoint": null,**

    **"logo\_url": null,**

    **"is\_mobadra": false,**

    **"sector": null,**

    **"is\_2fa\_enabled": false,**

    **"otp\_sent\_to": "56xxxxx8",**

    **"activation\_method": 1,**

    **"signed\_up\_through": null,**

    **"failed\_attempts": null,**

    **"custom\_export\_columns": \[\],**

    **"server\_IP": \[\],**

    **"username": null,**

    **"primary\_phone\_number": "+9715xxxxxxxx",**

    **"primary\_phone\_verified": true,**

    **"is\_temp\_password": false,**

    **"otp\_2fa\_sent\_at": null,**

    **"otp\_2fa\_attempt": null,**

    **"otp\_sent\_at": "2023-04-14T03:30:32.788498+04:00",**

    **"otp\_validated\_at": "2023-04-14T03:32:24.616763+04:00",**

    **"awb\_banner": null,**

    **"email\_banner": null,**

    **"identification\_number": null,**

    **"delivery\_status\_callback": "",**

    **"merchant\_external\_link": null,**

    **"merchant\_status": null,**

    **"deactivated\_by\_bank": false,**

    **"bank\_deactivation\_reason": null,**

    **"bank\_merchant\_status": null,**

    **"national\_id": null,**

    **"super\_agent": null,**

    **"wallet\_limit\_profile": null,**

    **"address": null,**

    **"commercial\_registration": null,**

    **"commercial\_registration\_area": null,**

    **"distributor\_code": null,**

    **"distributor\_branch\_code": null,**

    **"allow\_terminal\_order\_id": false,**

    **"allow\_encryption\_bypass": false,**

    **"wallet\_phone\_number": null,**

    **"suspicious": null,**

    **"latitude": null,**

    **"longitude": null,**

    **"bank\_staffs": {},**

    **"bank\_rejection\_reason": null,**

    **"bank\_received\_documents": false,**

    **"bank\_merchant\_digital\_status": null,**

    **"bank\_digital\_rejection\_reason": null,**

    **"filled\_business\_data": true,**

    **"day\_start\_time": "00:00:00",**

    **"day\_end\_time": null,**

    **"withhold\_transfers": false,**

    **"manual\_settlement": false,**

    **"sms\_sender\_name": "PayMob",**

    **"withhold\_transfers\_reason": null,**

    **"withhold\_transfers\_notes": null,**

    **"can\_bill\_deposit\_with\_card": false,**

    **"can\_topup\_merchants": false,**

    **"topup\_transfer\_id": null,**

    **"referral\_eligible": false,**

    **"is\_eligible\_to\_be\_ranger": false,**

    **"is\_ranger": false,**

    **"is\_poaching": false,**

    **"paymob\_app\_merchant": false,**

    **"settlement\_frequency": null,**

    **"day\_of\_the\_week": null,**

    **"day\_of\_the\_month": null,**

    **"allow\_transaction\_notifications": true,**

    **"allow\_transfer\_notifications": true,**

    **"sallefny\_amount\_whole": null,**

    **"sallefny\_fees\_whole": null,**

    **"paymob\_app\_first\_login": "2023-12-18T22:02:21.736025+04:00",**

    **"paymob\_app\_last\_activity": "2024-09-17T15:59:14.950682+04:00",**

    **"payout\_enabled": false,**

    **"payout\_terms": false,**

    **"is\_bills\_new": false,**

    **"can\_process\_multiple\_refunds": false,**

    **"settlement\_classification": null,**

    **"instant\_settlement\_enabled": false,**

    **"instant\_settlement\_transaction\_otp\_verified": false,**

    **"preferred\_language": "ar",**

    **"ignore\_flash\_callbacks": false,**

    **"acq\_partner": null,**

    **"dom": null,**

    **"bank\_related": null,**

    **"permissions": \[\]**

  **},**

  **"token": "ZXlKaGJHY2lPaUpJVXpVeE1pxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxamc="**

**}**

**The token has an expiration limit of 60 minutes. After this period, you will need to generate a new token.**

**Create Subscription plan**

### **Subscription Plan refers to a billing model that allows merchants to offer their products or services on a recurring basis.**

---

**You can create your own desired Subscription plan by using the below-mentioned APIs.**

**Step 1: First, you will run an Authentication request to get the Auth Bearer Token for Authorization as explained in the “[Authentication Request (Generated Token)”](https://developers.paymob.com/egypt/subscriptions-1/authentication-request-generate-token) section.**  
---

**Step 2: Please send a POST request to the URL below. Select "Bearer Token" as the authentication type and enter the authentication token in the token box of the authorization section.**

**URL: https://accept.paymob.com/api/acceptance/subscription-plans**

**Method: *POST***

**Source: *Merchant's server***

**Recipient: *Accept's server***

**Authorization: *Bearer Token {auth token} You need to enter the authentication token value in the token box, as shown in the image below.***

**Request:**  
{

    "frequency": "7",    // Set the deduction frequency using one of the numeric values: 7, 15, 30, 90, 180, or 365\. 

    "name": "Weekly Plan", // Plan's name.

    "reminder\_days": null,  //Set the number of days in advance you’d like to notify the customer for the renewal payment.

    "retrial\_days": null,   //Specify the days for retrying the subscription payment after a failed attempt.

    "plan\_type": "rent",

    "number\_of\_deductions": null, // The number of deductions applied to each subscription will be linked to this plan.

    "amount\_cents": "5000", // The amount of the renewal payment.

    "use\_transaction\_amount": true, // If enabled, the initial payment for creating the subscription will count as one of the deductions, and renewal payments will match the amount of that first transaction. If not, the first payment will only be for saving the end user's card, while the renewal payment will be based on the value of the "amount\_cents" key.

    "is\_active": true,  // Indicates whether the plan will be created will be active or paused. The default value is true

    "integration": "2697712", //Your Moto integartion ID for the renewal payments. 

    "webhook\_url": "https://webhook.site/d6a50eb1-0a58-47b6-9625-a77fbe7c363b" //The endpoint that will receive updates about the subscriptions related to this plan.

}

**Response (example):**

{

  "id": 127,

  "frequency": 7,

  "created\_at": "2024-09-20T18:07:56.185164+04:00",

  "updated\_at": "2024-09-20T18:07:56.185201+04:00",

  "name": "Testplan 3",

  "reminder\_days": null,

  "retrial\_days": null,

  "plan\_type": "rent",

  "number\_of\_deductions": null,

  "amount\_cents": 50000,

  "use\_transaction\_amount": true,

  "is\_active": true,

  "webhook\_url": "https://webhook.site/xxxxxxxxxxxxxxxxxxxxxxxxxxxx",

  "integration": 50428,

  "fee": null

}

**Important Notes:**

* Please make sure to use the Moto integration ID while creating a subscription plan.  
* You need to set parameter 'webhook\_url' while creating the plan request then you will start receiving the response

on webhook on any action (subscription level only).

* You will receive a unique webhook URL from the webhook site for testing, as illustrated in the image below.

| Field | Description | Mandatory |
| :---- | :---- | :---- |
| Frequency  (frequency) | Specify the frequency of deduction (e.g., Weekly, Biweekly, Monthly, Two months, Quarterly, Half annual, Yearly). Values in numbers are (7, 15, 30, 60, 90, 180, 360). | Yes |
| MIGS Moto Integration ID (integration) | MIGS Moto Integration ID, which will be used for upcoming transactions (recurring transactions). | Yes |
| Name (name) | Name the subscription plan for identification purposes. The maximum number of characters is (200). | Yes |
| Plan Type (plan\_type) | The type of the subscription plan. It accepts the values (rent) and the default is “rent” | No |
| Reminder Days (reminder\_days) | Specify the number of days before which you want to send a notification to the customer to pay (currently supporting email notifications). | No |
| Retrial Days (retrial\_days) | Define the days on which the subscription will be attempted again in case of a failure to collect the previous subscription amount. | No |
| Subscription Amount (amount\_cents) | Specify the subscription amount that will be charged. | Based on the Use Transaction Amount Flag |
| Use Transaction Amount Flag (use\_transaction\_amount) | If this flag is enabled, the system will use the first transaction amount instead of the specified subscription amount. Otherwise, it will use the subscription amount from the "Amount Cents." If "use\_transaction\_amount": **false**,/disabled //false; to override the create subscription amount. | Based on Subscription Amount |
| Number Of Deductions (number\_of\_deductions) | The number of deductions of this subscription. The default value is null. | No |
| Is Active (is\_active) | Indicates whether the plan will be created will be active or paused. The default value is true. | No |
| webhook\_url | You need to enter the unique webhook URL in this parameter | No |

**Create Subscriptions**

### **Subscriptions allow merchants to offer products or services on a recurring basis, facilitating automated billing.**

---

**Step 1:** You can create subscriptions by including the parameters outlined below in the normal Payment Intention API, as explained in the "[Create Intention/Payment API"](https://developers.paymob.com/egypt/checkout-copy-1/create-intention-payment-api) section.

**subscription\_plan\_id:** You can obtain the subscription plan ID from the response of the Create Subscription Plan request.

**subscription\_start\_date:** This field is optional. If you do not wish for your subscription to begin on the day you create it, you may specify a future date instead.  
**Step 2:** Please send a POST request to the URL below after adding "secret key" in the authorization    box in header section. 

**URL: https://accpet.paymob.com/v1/intention/**

**Method**: *POST*

**Source**: *Merchant's server*

**Recipient**: *Accept's server*

Please make sure to use the 3DS integration ID (normal card ID) while creating intention that will be used to create subscription once the customer pay.

You will receive a unique webhook URL from the webhook site for testing, as illustrated in the image below.

Request:  
{

    "amount": 5000, // amount\_cents must be equal to the sum of the items amounts

    "currency": "EGP",

    "payment\_methods":\[158\],   // Your Online 3DS Integration ID

    "subscription\_plan\_id":"5220", // Pass the subscription plan ID you created using the create subscription plan API.

    "subscription\_start\_date": "2025-11-20",  //If you ignore this parameter, the subscription will start immediately. If you specify a start date, it will begin from that date.

    "items": \[

        {

            "name": "Item name",

            "amount": "5000",

            "description": "Item description",

            "quantity": 1

        }

    \],

    "billing\_data": {

        "apartment": "dumy",

        "first\_name": "Mezo", // First Name, Last Name, Phone number, & Email are mandatory fields within sending the intention request

        "last\_name": "Mezo",

        "street": "dumy",

        "building": "dumy",

        "phone\_number": "+20122222453",

        "city": "dumy",

        "country": "dumy",

        "email": "ozazaa@hotmail.com",

        "floor": "dumy",

        "state": "dumy"

    },

    "special\_reference": "{{Merchant\_OrderID}}" // Refer to a unique or special identifier or reference associated with a transaction or order. It can be used for tracking or categorizing specific types of transactions and it returns within the transaction callback under merchant\_order\_id

    // "subscriptionv2\_id":null //Uses when you need to save a new card for an existing subscription, create a new transaction and pass the existed subscription ID to this parameter to list the new card with the subscription.

**Response Example:**

{ "payment\_keys": \[ { "integration": 158, "key": "ZXlKaGJHY2lPaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", "gateway\_type": "MIGS", "iframe\_id": null } \], "id": "pi\_test\_ec990fc53d164f019d2b02dd3beef94d", "intention\_detail": { "amount": 50000, "items": \[ { "name": "Item name 1", "amount": 50000, "description": "Watch", "quantity": 1, "image": null } \], "currency": "EGP", "billing\_data": { "apartment": "6", "floor": "1", "first\_name": "Ammar", "last\_name": "Sadek", "street": "938, Al-Jadeed Bldg", "building": "939", "phone\_number": "+968xxxxxxxx", "shipping\_method": "", "city": "", "country": "EGYPT", "state": "Alkhuwair", "email": "AmmarSadek@gmail.com", "postal\_code": "" } }, "client\_secret": "are\_csk\_test\_4707xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", "payment\_methods": \[ { "integration\_id": 158, "alias": null, "name": null, "method\_type": "online", "currency": "EGP", "live": false, "use\_cvc\_with\_moto": false } \], "special\_reference": null, "extras": { "creation\_extras": { "ee": 22 }, "confirmation\_extras": null }, "confirmed": false, "status": "intended", "created": "2024-09-20T22:01:36.496788+04:00", "card\_detail": null, "card\_tokens": \[\], "object": "paymentintention" }

To set your webhook URL for the Moto/3DS ID, follow these steps:

* Navigate to the Developers section and set your webhook URL.  
* Then, go to the Payment Integration section.  
* Click on the integration ID.  
* In the lower section of the page, you can edit the integration details. Add your webhook URL in the "Transaction Processed Callback" section, as shown in the image below.

Once you perform the payment using the intention API below, including the `subscription_plan_id` and `subscription_start_date (optional Parameter)` in the request parameters, your subscription will be successfully created for the specific cardholder who completed the payment .

**Step 3:** Once you are done with the Intention you need to call below url in the browser's window to access the checkout page as shown below. **https://accept.paymob.com/unifiedcheckout/?publicKey=\<add your public key here\>\&clientSecret=\<add your client secret key here\>**

## **Obtaining Your Keys**

To access your Public Key and Client Secret Key, please follow these instructions:

* **Public Key:** You can retrieve your Public Key from your Dashboard. For detailed steps, refer to the [section](https://developers.paymob.com/egypt/api-reference-guide/api-setup-secret-and-public-key) on accessing your Public Key.  
* **Client Secret Key:** Your Client Secret Key will be included in the response from the Intention API, as demonstrated in the example below.

Step 4: Please enter your card details. For test credentials ( paymob payment window)

Step 5: The approval message will be displayed on the screen if the transaction is successful.

### **Webhook Responses:**

**Response 1: Callback Response**  
{  
"type": "TRANSACTION",  
"obj": {  
"id": 228082681,  
"pending": false,  
"amount cents": 2000,  
"success": true,  
"is \_auth": false,  
"is\_capture": false,  
"is \_standalone\_payment": true,  
"is\_voided": false,  
"is \_refunded": false,  
"is\_3d\_secure": true,  
"integration\_id": 4579772,  
"profile\_id": 972707,  
"has \_parent\_transaction": false,  
"order": {  
"id": 256603884,  
"created at": "2024-10-21T14:44:17.001053",  
"delivery\_needed": false,  
"merchant": {  
"id": 972707,  
"created at": "2024-04-22723:08:55.679657"  
"phones": \[  
“+201180154377"\],

**Response: 2 Subscription Response**

**{**  
**"subscription\_data": {**  
**"id": 356,**  
**"client info": {**  
**"email":**  
**v♥**  
**"full name": "Ammar Sadek"**  
**"phone number":**  
**"+:**  
**}, "frequency": 7,**  
**"created at": "2024-09-20T22:07:42.889277+04:00",**  
**"updated\_at": "2024-09-2022:07:42.889342+04:00",**  
**"name": "Testplan 3"**  
**"reminder\_days": null,**  
**"retrial\_days": null,**  
**"plan\_id": 127,**  
**"state": "active",**  
**"amount\_cents": 50000,**  
**"starts at": "2024-09-25"**  
**"next \_billing": "2024-09-25".**  
**"reminder\_date": null,**  
**"ends at": null,**  
**"resumed\_at": null,**  
**"suspended at": null,**  
**"webhook ur\]": "https: //webhook.site,xxx**

**Response 3: Token**

**You will receive the token response only if you select the "Save Card" option on the checkout page as shown in the below image.**

**Suspend Subscription Plan**

### **Suspend Subscription Plan API will temporarily deactivate the subscription plan.**

**Step 1: First, you will run an Authentication request to get the Auth Bearer Token for Authorization as explained in the “[Authentication Request (Generated Token)”](https://developers.paymob.com/egypt/subscriptions-1/authentication-request-generate-token) section.**  
---

**Step 2: The below API allows you to suspend a specific subscription plan identified by `{{SUBSCRIPTION_PLAN_ID}}`. To do so, please send a POST request to the URL below. Select "Bearer Token" as the authentication type and enter the authentication token in the token box of the authorization section.**

**URL: https://accept.paymob.com/api/acceptance/subscription-plans/{subscription-plan id}/suspend**

**“You will just pass the subscription plan id in the above URL to suspend your subscription plan.”**

**Method: *POST***

**Source: *Merchant's server***

**Recipient: *Accept's server***

**Authorization: *Bearer Token {auth token} You need to enter the authentication token value in the token box, as shown in the image below.***

**You will get the parameter “is\_active” as “false” which confirms that your subscription plan has been paused.**

**Response Example:**  
{ "id": 127, "frequency": 7, "created\_at": "2024-09-20T18:07:56.185164+04:00", "updated\_at": "2024-09-20T18:07:56.185201+04:00", "name": "Testplan 3", "reminder\_days": null, "retrial\_days": null, "plan\_type": "rent", "number\_of\_deductions": null, "amount\_cents": 50000, "use\_transaction\_amount": true, "is\_active": false, "webhook\_url": "https://webhook.site/xxxxxxxxxxxxxxxxxxxxxxxxxxx", "integration": 11111, "fee": null }

**Resume Subscription plan**

### **Resume Subscription Plan API will resume your subscription plan.**

**Step 1:** First, you will run an Authentication request to get the Auth Bearer Token for Authorization as explained in the “[**Authentication Request (Generated Token)”**](https://developers.paymob.com/egypt/subscriptions-1/authentication-request-generate-token) section.  
---

**Step 2:** The below API allows you to suspend a specific subscription plan identified by `{{SUBSCRIPTION_PLAN_ID}}`. To do so, please send a POST request to the URL below. Select "Bearer Token" as the authentication type and enter the authentication token in the token box of the authorization section.

**URL: https://accept.paymob.com/api/acceptance/subscription-plans/{subscription-plan id}/resume**

“You will just pass the subscription plan id in the above URL to resume your subscription plan.”

**Method**: *POST*

**Source**: *Merchant's server*

**Recipient**: *Accept's server*

**Authorization**: *Bearer Token {auth token} You need to enter the authentication token value in the token box, as shown in the image below.*

You will get the parameter **“is\_active” as “True**” which confirms that your subscription plan has been resumed.You will get the parameter **“is\_active” as “True**” which confirms that your subscription plan has been resumed.

**Response Example:**  
{ "id": 127, "frequency": 7, "created\_at": "2024-09-20T18:07:56.185164+04:00", "updated\_at": "2024-09-20T18:07:56.185201+04:00", "name": "Testplan 3", "reminder\_days": null, "retrial\_days": null, "plan\_type": "rent", "number\_of\_deductions": null, "amount\_cents": 50000, "use\_transaction\_amount": true, "is\_active": true, "webhook\_url": "https://webhook.site/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", "integration": 1111, "fee": null }

**Update Subscription Plan**

### **Update Subscription Plan API allows you to modify the subscription plan amount, number of deductions, and integration ID for a specific subscription plan.**

---

**Step 1:** First, you will run an Authentication request to get the Auth Bearer Token for Authorization as explained in the “[**Authentication Request (Generated Token)”**](https://developers.paymob.com/egypt/subscriptions-1/authentication-request-generate-token) section.  
---

**Step 2:** Please send a POST request to the URL below. Select "Bearer Token" as the authentication type and enter the authentication token in the token box of the authorization section and including subscription Plan amount, number of deductions, and integration id (moto) value in the request parameter.

**URL: https://accept.paymob.com/api/acceptance/subscription-plans/{subscription-plan id}**

“You will just pass the subscription plan ID in the above URL to update the (subscription plan amount, number of deductions, and integration ID (moto) for a specific subscription plan.

**Method**: *PUT*

**Source**: *Merchant's server*

**Recipient**: *Accept's server*

**Authorization**: *Bearer Token {auth token} You need to enter the authentication token value in the token box, as shown in the image below.*

**Request:**  
**'{ "number\_of\_deductions": 3, "amount\_cents": 1000, "integration": 11111 }'**

**Response examle:**  
**{**

  **"id": 127,**

  **"frequency": 7,**

  **"created\_at": "2024-09-20T18:07:56.185164+04:00",**

  **"updated\_at": "2024-09-24T17:54:36.669667+04:00",**

  **"name": "Testplan 3",**

  **"reminder\_days": null,**

  **"retrial\_days": null,**

  **"plan\_type": "rent",**

  **"number\_of\_deductions": 3,**

  **"amount\_cents": 1000,**

  **"use\_transaction\_amount": true,**

  **"is\_active": true,**

  **"webhook\_url": "https://webhook.site/xxxxxxxxxxxxxxxxxxxxxxxxxxxx",**

  **"integration": 11111,**

  **"fee": null**

**}**

**Suspend Subscription**

### **Suspend Subscription API allows you to suspend a subscription and temporarily stop its active billing.**

---

**Step 1: First, you will run an Authentication request to get the Auth Bearer Token for Authorization as explained in the “[Authentication Request (Generated Token)”](https://developers.paymob.com/egypt/subscriptions-1/authentication-request-generate-token) section.**  
---

**Step 2: Please send a POST request to the URL below. Select "Bearer Token" as the authentication type and enter the authentication token in the token box of the authorization section.**

**URL: https://accept.paymob.com/api/acceptance/subscriptions/{subscription- id}/suspend**

**“You will just pass the subscription ID in the above URL to suspend your subscription .”**

**Method: *POST***

**Source: *Merchant's server***

**Recipient: *Accept's server***

**Authorization: *Bearer Token {auth token} You need to enter the authentication token value in the token box, as shown in the image below.***

In response to the Suspend API request, the response body will include the current state of the subscription, indicated by the parameter "state": "suspended". Additionally, the response will contain the parameters "resumed\_at" and "suspended\_at", which provide timestamps for when the subscription was resumed and suspended, respectively.

**Response Example:**

**{ "id": 356, "client\_info": { "email": "xxxxxxxxxxxxx@gmail.com", "full\_name": "xxxxxxxxxxx", "phone\_number": "xxxxxxxxxx" }, "frequency": 7, "created\_at": "2024-09-20T22:07:42.889277+04:00", "updated\_at": "2024-09-20T22:07:42.889342+04:00", "name": "Testplan 3", "reminder\_days": null, "retrial\_days": null, "plan\_id": 127, "state": "suspended", "amount\_cents": 50000, "starts\_at": "2024-09-25", "next\_billing": "2024-09-25", "reminder\_date": null, "ends\_at": null, "resumed\_at": null, "suspended\_at": "2024-09-23", "webhook\_url": "https://webhook.site/2xxxxxxxxxxxxxxxxxxxxxxxxxx", "integration": 50428, "initial\_transaction": 540326 }**

**Resume Subscription**

### **Resume Subscription API allows you to reactivate a subscription and resume billing.**

---

**Step 1: First, you will run an Authentication request to get the Auth Bearer Token for Authorization as explained in the “[Authentication Request (Generated Token)”](https://developers.paymob.com/egypt/subscriptions-1/authentication-request-generate-token) section.**  
---

**Step 2: Please send a POST request to the URL below. Select "Bearer Token" as the authentication type and enter the authentication token in the token box of the authorization section.**

**URL: https://accept.paymob.com/api/acceptance/subscriptions/{subscription- id}/resume**

**“You will just pass the subscription ID in the above URL to resume your subscription .”**

**Method: *POST***

**Source: *Merchant's server***

**Recipient: *Accept's server***

**Authorization: *Bearer Token {auth token} You need to enter the authentication token value in the token box, as shown in the image below.***

In response to the Resume API request, the response body will include the current state of the subscription, indicated by the parameter `"state": "active"`. Additionally, the response will contain the parameters `"resumed_at"` and `"suspended_at"`, which provide timestamps for when the subscription was resumed and suspended, respectively.

**Response Example:**  
**{ "id": 356, "client\_info": { "email": "xxxxxxx@gmail.com", "full\_name": "xxxxxxxxxxxxxxxx", "phone\_number": "xxxxxxxxxxxxxxxxx" }, "frequency": 7, "created\_at": "2024-09-20T22:07:42.889277+04:00", "updated\_at": "2024-09-20T22:07:42.889342+04:00", "name": "Testplan 3", "reminder\_days": null, "retrial\_days": null, "plan\_id": 127, "state": "active", "amount\_cents": 50000, "starts\_at": "2024-09-25", "next\_billing": "2024-09-25", "reminder\_date": null, "ends\_at": null, "resumed\_at": "2024-09-23", "suspended\_at": "2024-09-23", "webhook\_url": "https://webhook.site/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", "integration": 50428, "initial\_transaction": 540326 }**

**Cancel Subscription**

### **Cancel Subscription API allows you to cancel your subscription. Only suspended subscriptions can be resumed; canceling a subscription will permanently terminate it.**

---

**Step 1: First, you will run an Authentication request to get the Auth Bearer Token for Authorization as explained in the “[Authentication Request (Generated Token)”](https://developers.paymob.com/egypt/subscriptions-1/authentication-request-generate-token) section.**  
---

**Step 2: Pease send a POST request to the URL below. Select "Bearer Token" as the authentication type and enter the authentication token in the token box of the authorization section.**

**URL: https://accept.paymob.com/api/acceptance/subscriptions/{subscription- id}/cancel**

**“You will just pass the subscription id in the above URL to cancel your subscription .**

**Method: *POST***

**Source: *Merchant's server***

**Recipient: *Accept's server***

**Authorization: *Bearer Token {auth token} You need to enter the authentication token value in the token box, as shown in the image below.***

**Response Example:**  
{ "id": 3, "client\_info": { "full\_name": "Clifford Nicolas", "email": "claudette09@exa.com", "phone\_number": "+86(8)9135210487" }, "frequency": 7, "created\_at": "2023-11-28T14:44:53.587174", "updated\_at": "2023-11-28T14:44:53.587191", "name": "Test Subscription", "reminder\_days": 3, "retrial\_days": 3, "plan\_id": 3, "state": "canceled", "amount\_cents": 200, "starts\_at": "2023-11-28", "next\_billing": "2023-12-12", "reminder\_date": "2023-12-09", "ends\_at": null, "resumed\_at": "2023-12-05", "suspended\_at": "2023-12-05", "integration": 3381753, "initial\_transaction": 147018623 }

In response to the Cancel Subscription API request ,you will receive a state of the subscription in the response parameters as mentioned above in response body i.e. **"state": "canceled".** You can also find the **"resumed at"** and **"suspended at"** parameters in the response body.

**Update Subscription**

### **Update Subscription API allows you to modify the subscription amount and the subscription end date for a specific subscription.**

---

**Step 1:** First, you will run an Authentication request to get the Auth Bearer Token for Authorization as explained in the “[**Authentication Request (Generated Token)”**](https://developers.paymob.com/egypt/subscriptions-1/authentication-request-generate-token) section.  
---

**Step 2:** Please send a PUT request to the URL below. Select "Bearer Token" as the authentication type and enter the authentication token in the token box of the authorization section.

**URL: https://accept.paymob.com/api/acceptance/subscriptions/{subscription- id}**

“You will just pass the subscription id in the above URL to update your subscription .”

**Method**: *PUT*

**Source**: *Merchant's server*

**Recipient**: *Accept's server*

**Authorization**: *Bearer Token {auth token} You need to enter the authentication token value in the token box, as shown in the image below.*

**Request:**  
{

    "amount\_cents": {{Amount\_cents}}, // The amount of the subscription.

    "ends\_at": "2024-01-25" // The end date of subscription. 

}

**Response Example:**  
{ "id": 356, "client\_info": { "email": "xxxxxxxxxxxx@gmail.com", "full\_name": "xxxxxxxxxxxx", "phone\_number": "+xxxxxxxxxxx" }, "frequency": 7, "created\_at": "2024-09-20T22:07:42.889277+04:00", "updated\_at": "2024-09-20T22:07:42.889342+04:00", "name": "Testplan 3", "reminder\_days": null, "retrial\_days": null, "plan\_id": 127, "state": "active", "amount\_cents": 25000, "starts\_at": "2024-09-25", "next\_billing": "2024-09-25", "reminder\_date": null, "ends\_at": "2025-01-22", "resumed\_at": "2024-09-23", "suspended\_at": "2024-09-23", "webhook\_url": "https://webhook.site/xxxxxxxxxxxxxxxxxxxxxxxxxxxxx", "integration": 50428, "initial\_transaction": 540326 }

**List Subscription Transactions**

### **List Subscription Transactions API allows you to list down all transactions against one specific subscription ID.**

---

**Step 1:** First, you will run an Authentication request to get the Auth Bearer Token for Authorization as explained in the “[**Authentication Request (Generated Token)”**](https://developers.paymob.com/egypt/subscriptions-1/authentication-request-generate-token) section.  
---

**Step 2:** Please send a GET request to the URL below. Select "Bearer Token" as the authentication type and enter the authentication token in the token box of the authorization section.

“You will just pass the subscription id in the above URL to list down all transactions against specific subscription ID.

**URL: https://accept.paymob.com/api/acceptance/subscriptions/{Subscription\_Id}/transactions**

**Method**: *GET*

**Source**: *Merchant's server*

**Recipient**: *Accept's server*

**Authorization**: *Bearer Token {auth token} You need to enter the authentication token value in the token box, as shown in the image below.*

**Webhook**

### **Do Subscriptions Support Webhooks?**

Yes, subscriptions support webhooks. You can add a webhook URL when creating a new subscription plan using this “**Webhook New Subscription Plan**” section. Additionally, you can add a webhook URL in the existing subscription ID in the “**Webhook Existing Subscription Plan**” Section.

**Webhook-New Subscription Plan**

You can create your own desired Subscription plan by using the below-mentioned APIs.

**Step 1:** First, you will run an Authentication request to get the Auth Bearer Token for Authorization as explained in the “[**Authentication Request”**](https://developers.paymob.com/egypt/subscriptions-1/authentication-request-generate-token) section.

**Step 2:** Please send a POST request to the URL below. Select "Bearer Token" as the authentication type and enter the authentication token in the token box of the authorization section.

**URL: https://accept.paymob.com/api/acceptance/subscription-plans**

**Method**: *POST*

**Source**: *Merchant's server*

**Recipient**: *Accept's server*

**Authorization**: *Bearer Token {auth token} You need to enter the authentication token value in the token box, as shown in the image below.*  
**Important Notes:**

* Please make sure to use the Moto integration ID while creating a subscription plan.  
* You need to set parameter 'webhook\_url' while creating the plan request then you will start receiving the webhook on any action on the plan itself.

Request:  
curl \--location 'https://accept.paymob.com/api/acceptance/subscription-plans' \\ \--header 'Content-Type: application/json' \\ \--data '{ "frequency": 7, "name": "Testplan 3", "webhook\_url": "https://webhooksite", "reminder\_days": null, "retrial\_days": null, "plan\_type": "rent", "number\_of\_deductions": null, "amount\_cents": 700, "use\_transaction\_amount": true, "is\_active": true, "integration": 4424012, "fee": null }'

Response:  
{ "id": 10, "frequency": 7, "created\_at": "2024-01-15T18:02:03.314636", "updated\_at": "2024-01-15T18:02:03.314656", "name": "Testplan 3", "reminder\_days": null, "retrial\_days": null, "plan\_type": "rent", "number\_of\_deductions": null, "amount\_cents": 700, "use\_transaction\_amount": true, "is\_active": true, "integration": 4424012, "fee": null }

To set your webhook URL for the Moto/3DS ID, follow these steps:

* Navigate to the Developers section and set your webhook URL.  
* Then, go to the Payment Integration section.  
* Click on the integration ID.  
* In the lower section of the page, you can edit the integration details. Add your webhook URL in the "Transaction Processed Callback" section, as shown in the image below.

###        **Webhook Responses:**

**Response 1: Callback Response**  
**{**  
**"type": "TRANSACTION",**  
**"obj": {**  
**"id": 228082681,**  
**"pending": false,**  
**"amount cents": 2000,**  
**"success": true,**  
**"is \_auth": false,**  
**"is\_capture": false,**  
**"is \_standalone\_payment": true,**  
**"is\_voided": false,**  
**"is \_refunded": false,**  
**"is\_3d\_secure": true,**  
**"integration\_id": 4579772,**  
**"profile\_id": 972707,**  
**"has \_parent\_transaction": false,**  
**"order": {**  
**"id": 256603884,**  
**"created at": "2024-10-21T14:44:17.001053",**  
**"delivery\_needed": false,**  
**"merchant": {**  
**"id": 972707,**  
**"created at": "2024-04-22723:08:55.679657"**  
**"phones": \[01232311432\],**  
**“**

**Response: 2 Subscription Response**  
{  
"subscription\_data": {  
"id": 356,  
"client info": {  
"email":””,  
"full name": "Ammar Sadek"  
"phone number":  
"+:  
}, "frequency": 7,  
"created at": "2024-09-20T22:07:42.889277+04:00",  
"updated\_at": "2024-09-2022:07:42.889342+04:00",  
"name": "Testplan 3"  
"reminder\_days": null,  
"retrial\_days": null,  
"plan\_id": 127,  
"state": "active",  
"amount\_cents": 50000,  
"starts at": "2024-09-25"  
"next \_billing": "2024-09-25".  
"reminder\_date": null,  
"ends at": null,  
"resumed\_at": null,  
"suspended at": null,  
"webhook ur\]": "https: //webhook.site,

**Response 3: Token**

You will receive the token response only if you select the "Save Card" option on the checkout page as shown in the below image.  
{  
"type": "TOKEN",  
"obj": {  
"id": 29571,  
"token": "93c8503b+  
"masked\_pan": "xxxx-xxxx-xxxx-2346"  
"merchant id": 106,  
"card\_subtype": "MasterCard",  
"created at": "2024-09-20T22:07:10.928460+04:00"  
"email": ""  
"order\_id": "647836",  
"user added": false  
}

}

**Step 1:** First, you will run an Authentication request to get the Auth Bearer Token for Authorization as explained in the [“**Authentication Request”**](https://developers.paymob.com/egypt/subscriptions-1/authentication-request-generate-token) section.

**Step 2:** Please send a POST request to the URL below. Select "Bearer Token" as the authentication type and enter the authentication token in the token box of the authorization section.

**URL: https://accept.paymob.com/api/acceptance/subscriptions/subID/register\_webhook**

**Method**: *POST*

**Source**: *Merchant's server*

**Recipient**: *Accept's server*

**Authorization**: *Bearer Token {auth token} You need to enter the authentication token value in the token box, as shown in the image below.*

REquest:  
curl \--location 'https://accept.paymob.com/api/acceptance/subscriptions/subID/register\_webhook' \\ \--header 'Content-Type: application/json' \\ \--data '{ "url": "https://webhook" }'

Response Example:  
{ "id": 368, "client\_info": { "email": "xxxxxxxxxxxx@gmail.com", "full\_name": "Axxxxxxx", "phone\_number": "+96xxxxxxxxxxx8" }, "frequency": 7, "created\_at": "2024-09-27T10:02:46.440220+04:00", "updated\_at": "2024-09-27T10:02:46.440254+04:00", "name": "Testplan 3", "reminder\_days": null, "retrial\_days": null, "plan\_id": 140, "state": "active", "amount\_cents": 20000, "starts\_at": "2024-09-27", "next\_billing": "2024-10-04", "reminder\_date": null, "ends\_at": null, "resumed\_at": null, "suspended\_at": null, "webhook\_url": "https://webhook.site/f3ab2xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx5", "integration": 50428, "initial\_transaction": 557253 }

**Response 1: Callback Response**

**Response: 2 Subscription Response**

**Response 3: Token**

You will receive the token response only if you select the "Save Card" option on the checkout page as shown in the below image.

**HMAC Calculation for Subscription Callback**

When a webhook is registered to a subscription, any actions performed on the subscription will trigger a callback. This callback is sent as a POST request to the registered webhook, containing the updated subscription data. The HMAC value for this callback is provided in the body of the subscription callback request as a parameter named `hmac` (unlike transaction or card token callbacks, where it is typically sent as a query parameter).

### **Subscription Callback:**

 {

  "paymob\_request\_id": "df9e4ecf-12e0-4925-b258-65423f32bc98",

  "subscription\_data": {

    "id": 1264,

    "client\_info": {

      "email": "test@test.com",

      "full\_name": "mo ay",

      "phone\_number": "01010101010"

    },

    "frequency": 365,

    "created\_at": "2024-12-03T22:11:02.280164",

    "updated\_at": "2024-12-03T22:11:02.280179",

    "name": "Testplan 3",

    "reminder\_days": null,

    "retrial\_days": null,

    "plan\_id": 1186,

    "state": "suspended",

    "amount\_cents": 330,

    "starts\_at": "2024-12-20",

    "next\_billing": "2024-12-20",

    "reminder\_date": null,

    "ends\_at": null,

    "resumed\_at": null,

    "suspended\_at": "2024-12-03",

    "webhook\_url": "https://webhook.site/a16ba9d5-4f4a-47dc-8005-e6ec2d197f26",

    "integration": 4565330,

    "initial\_transaction": 241322967

  },

  "trigger\_type": "suspended",

  "hmac": "dd5b3018888d9f98574cd180793db10d969b522e08c62baf2ea33357d1546b567b7fd79760e90046e90eaacf30024ede5539cbd0748bd9e6c005faf5117e0e7b"

}

### **HMAC Calculation Method**

#### **1.Extract the Relevant Parameters**

* `subscription_data.id`: Subscription ID (`1264` in the example).  
* `trigger_type`: The action taken on the subscription (`suspended` in the example).

#### **2.Create the Concatenated String**

The string format is:

`”{action}for{subscription_id}”`

Example: The string for the above object is “suspendedfor1264“

#### **3.Hash the String**

* Use the SHA-512 hashing algorithm.  
* Hash the concatenated string using the merchant’s HMAC secret key. (This step is the same as calculating HMAC for normal [callbacks](https://developers.paymob.com/egypt/manage-callback/transaction-callbacks).)

#### **4.Compare the HMAC**

Compare the HMAC value sent in the request body (`hmac` parameter) with the calculated HMAC. If they match, the request is authenticated.

