See the dummy-session folder to see a list of requests

Noting a breakdown of what happens:

-   Getting to the first form page where you enter POST CODE
    -   GET https://testvalley.gov.uk/wasteandrecycling/when-are-my-bins-collected/look-up-my-bin-collection-days
        -   RESPONSE 302 redirect to: https://iweb.itouchvision.com/portal/f?p=customer:BIN_DAYS:::NO:RP:UID:13353F039C4B1454827EE05536414091A8C058F4
-   Submitting the post code in order to get the page with the list of addresses
    -   POST https://iweb.itouchvision.com/portal/wwv_flow.accept
        -   BODY ...........
        -   RESPONSE 302 redirect to: https://iweb.itouchvision.com/portal/itouchvision/r/customer/bin_days
            -   somehow the browser goes to this new page and then shows addresses?
-   Submitting the selected address from the list to get the bin dates:
    -   POST https://iweb.itouchvision.com/portal/wwv_flow.accept
        -   BODY ...........
        -   RESPONSE 302 redirect to: https://iweb.itouchvision.com/portal/itouchvision/r/customer/bin_days

Theory:

-   make first request to establish session and get the cookie
    -   GET https://iweb.itouchvision.com/portal/f?p=customer:BIN_DAYS:::NO:RP:UID:13353F039C4B1454827EE05536414091A8C058F4
-   make the second request submit the post code into the session
    -   POST https://iweb.itouchvision.com/portal/wwv_flow.accept
    -   BODY has the post code etc in it
    -   this gives a 302 back to the `bin_days` page but since you make the request with your cookie leading to the session where you submitted post code it is able to give you street addresses now
-   make the third request to get the page with the street addresses but since we have cookie session they know what we submitted
    -   GET https://iweb.itouchvision.com/portal/itouchvision/r/customer/bin_days
-   make the fourth request to submit your desired street address from that page
    -   POST https://iweb.itouchvision.com/portal/wwv_flow.accept
    -   BODY has the post code etc in it
    -   this again gives you a 302 back to the `bin_days` and now your session has post code and street address submitted ready to get bin dates
-   make the fifth request to get the bin dates using that session now it is fully primed
    -   GET https://iweb.itouchvision.com/portal/itouchvision/r/customer/bin_days
