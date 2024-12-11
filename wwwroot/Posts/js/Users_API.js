class Users_API {
    static Host_URL() { return "http://localhost:5000"; }
    static API_URL() { return this.Host_URL() + "/accounts" };
    static Login_API_URL() { return this.Host_URL() + "/token" };

    static getLoginUser() {
        return JSON.parse(sessionStorage.getItem("user"));
    }

    static initHttpState() {
        this.currentHttpError = "";
        this.currentStatus = 0;
        this.error = false;
    }
    static setHttpErrorState(xhr) {
        if (xhr.responseJSON)
            this.currentHttpError = xhr.responseJSON.error_description;
        else
            this.currentHttpError = xhr.statusText == 'error' ? "Service introuvable" : xhr.statusText;
        this.currentStatus = xhr.status;
        this.error = true;
    }
    static async HEAD() {
        Users_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL(),
                type: 'HEAD',
                contentType: 'text/plain',
                complete: data => { resolve(data.getResponseHeader('ETag')); },
                error: (xhr) => { Users_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async Get(id = null) {
        Users_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL() + (id != null ? "/" + id : ""),
                complete: data => { resolve({ ETag: data.getResponseHeader('ETag'), data: data.responseJSON }); },
                error: (xhr) => { Users_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async GetQuery(queryString = "") {
        Users_API.initHttpState();
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL() + queryString,
                complete: data => {
                    resolve({ ETag: data.getResponseHeader('ETag'), data: data.responseJSON });
                },
                error: (xhr) => {
                    Users_API.setHttpErrorState(xhr); resolve(null);
                }
            });
        });
    }
    static async Login(data) {
        return new Promise(resolve => {
            $.ajax({
                url: this.Login_API_URL(),
                type: "POST",
                contentType: 'application/json',
                data: JSON.stringify(data),
                success: (data) => { 
                    sessionStorage.setItem("token", data.Access_token);
                    sessionStorage.setItem("user", JSON.stringify(data.User));
                    console.log(sessionStorage.getItem('token'));
                    console.log(sessionStorage.getItem('user'));
                    resolve(data); 
                },
                error: (xhr) => { Users_API.setHttpErrorState(xhr); resolve(null); }
            });
        });
    }
    static async Save(data, create = true) {
        Users_API.initHttpState();
        if (create) {
            return new Promise(resolve => {
                $.ajax({
                    url: this.API_URL() + "/register/" + data.Id,
                    type: "POST",
                    contentType: 'application/json',
                    data: JSON.stringify(data),
                    success: (data) => { resolve(data); },
                    error: (xhr) => { Users_API.setHttpErrorState(xhr); resolve(null); }
                });
            });
        } else {
            return new Promise(resolve => {
                $.ajax({
                    url: this.API_URL() + "/modify/" + data.Id,
                    type: "PUT",
                    contentType: 'application/json',
                    data: JSON.stringify(data),
                    success: (data) => { resolve(data); },
                    error: (xhr) => { Users_API.setHttpErrorState(xhr); resolve(null); }
                });
            });
        }
        
    }
    static async Delete(id) {
        return new Promise(resolve => {
            $.ajax({
                url: this.API_URL() + "/remove/" + id,
                type: "DELETE",
                success: () => {
                    Users_API.initHttpState();
                    resolve(true);
                },
                error: (xhr) => {
                    Users_API.setHttpErrorState(xhr); resolve(null);
                }
            });
        });
    }
}