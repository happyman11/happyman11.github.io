function isNotEmpty(value)
                    {
                      if (value == null || typeof value == 'undefined' ) return false;
                          return (value.length > 0);
                    }


function isEmail(email)
                    {
                  let regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
                  return regex.test(String(email).toLowerCase());
}

 function SendMail() {
         var button =  document.getElementById("form-button");
         button.innerHTML= "Submitting";
         button.disabled = true;
         button.style.background= '#000000';

          var theDivload =  document.getElementById("load");
          theDivload.style.display= "block";

          var theDiv1 =  document.getElementById("notok");
          theDiv1.style.display= "none";

          var theDiv2 =  document.getElementById("ok");
          theDiv2.style.display= "none";


        let name = document.getElementById("name").value
        let check_name= isNotEmpty(name)

        let email = document.getElementById("email").value
        let check_email= isEmail(email)


        let subject = document.getElementById("subject").value
        let check_subject= isNotEmpty(subject)


        let message=document.getElementById("message").value
        let check_message= isNotEmpty(message)

        let contactform=document.getElementById('contact-form')
        let contactformmessage=document.getElementById("contactformmessage")


        if ( check_name && check_email  && check_subject && check_message )

        {


            let headersList = {
                               "Accept": "*/*",
                              "Authorization": "Token 78edb129dc27b9928759f79565d875391cb55f3b",
                              "Content-Type": "application/json"
                              }

            let bodyContent = JSON.stringify({
                                              "user_name":name,
                                              "user_email":email,
                                              "user_subject":subject,
                                              "user_message":message
                                            });

            let reqOptions = {
                              url: "https://contactformapiwix.herokuapp.com/sendmail/",
                              method: "POST",
                              headers: headersList,
                              data: bodyContent,
                            }


           axios.request(reqOptions)
            .then(response => {

                  if (response.data.status==200){
                         contactform.reset()

                         console.log()
                        var button =  document.getElementById("form-button");
                        button.innerHTML= "Submitted";
                         button.disabled = true;
                        button.style.background= "#000000";


                         var theDivload =  document.getElementById("load");
                         theDivload.style.display= "none";

                         var theDiv =  document.getElementById("ok");
                         theDiv.style.display= "block";
                         theDiv.innerHTML = String(response.data.response)+' If Intrested Please visit <a style="color:black;"href="https://www.rstiwari.com"> Profile</a>';



                  }
                  else
                  {
                    var load =  document.getElementById("load");
                    load.style.display= "none";

                    var button =  document.getElementById("form-button");
                        button.innerHTML= "Failed !!";
                         button.disabled = false;
                        button.style.background= '#000000';




                    var theDiv =  document.getElementById("notok");
                    theDiv.style.display= "block";
                    theDiv.innerHTML =  String(response.data.response)+' Resubmit on <a style="color:black;"href="https://www.rstiwari.com/contact"> Website Contact</a>';
                    //location.href = "https://www.rstiwari.com/contact";
                  }

              }

          )

        }

       else
       {

        var button =  document.getElementById("form-button");
        button.innerHTML= "Try Again";
        button.disabled = false;
        button.style.background= '#000000';


        var load =  document.getElementById("load");
        load.style.display= "none";
        var theDiv =  document.getElementById("notok");
        theDiv.style.display= "block";

        if (!check_email)
        {
        theDiv.innerHTML = 'OOPs!!! Invalid Email ';


        }

        else if (!check_name)
        {
        theDiv.innerHTML = 'OOPs!!! Name is empty ';

        }

        else if (!check_subject)
        {
        theDiv.innerHTML = 'OOPs!!! Subject is empty ';

        }

        else if (!check_message)
        {
        theDiv.innerHTML = 'OOPs!!! Message is empty ';
        }

       }

 }
