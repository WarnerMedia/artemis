<!DOCTYPE html>
<html>
<script>
    document.cookie = "signin_redirect=" + document.location.href + "; Path=/; SameSite=Lax; Secure";

    host = window.location.hostname

    fetch("https://" + host + "/api/v1/system/status").then(
        response => {
            if (response.status == 503) {
                window.location.replace("https://" + host + "/api/v1/system/status");
            } else {
                window.location.replace("https://${cognito_domain}/oauth2/authorize?response_type=code&identity_provider=${identity_provider}&client_id=${cognito_app_id}&redirect_uri=https://" + host + "/signin&scope=email+openid");
            }
        }
    );
</script>

</html>