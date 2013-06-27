(function (window, document, $) {
    function User(serverUser, showHiddenObservable) {
        this.id = serverUser.id;
        this.firstName = serverUser.first_name;
        this.lastName = serverUser.last_name;
        this.userImage = serverUser.user_image;

        var hiddenUsers = localStorage.getItem('hiddenUsers').split(',');
        var isHidden = $.inArray(this.id.toString(), hiddenUsers) !== -1;
        this.hidden = ko.observable(isHidden);
        this.hide = function () {
            var hiddenUsers = localStorage.getItem('hiddenUsers').split(',');
            hiddenUsers.push(this.id.toString());
            localStorage.setItem('hiddenUsers', hiddenUsers);
            this.hidden(true);
        };
        this.show = function () {
            var hiddenUsers = localStorage.getItem('hiddenUsers').split(','),
                that = this;
            hiddenUsers = $.grep(hiddenUsers, function (item) {
                return item !== that.id.toString();
            });
            localStorage.setItem('hiddenUsers', hiddenUsers);
            this.hidden(false);
        };
        this.visible = ko.computed(function () {
            return !this.hidden() || showHiddenObservable();
        }, this);
        this.dataLoaded = ko.observable(false);

        this.fullName = ko.computed(function () {
            return this.firstName + " " + this.lastName;
        }, this);

        this.getCount = function (type) {
            return this[type + "Count"];
        };

        this.defectsCount = ko.observable(0);

        this.featuresCount = ko.observable(0);

        this.incidentsCount = ko.observable(0);

        this.itemsCount = ko.computed(function () {
            return this.defectsCount() + this.featuresCount() + this.incidentsCount();
        }, this);

        this.workRemainingMinutes = ko.observable(0);
        this.workRemaining = ko.computed(function () {
            return Math.round(this.workRemainingMinutes() / 60) + " Hours";
        }, this);
    };

   	//null means no users are currently being processed.
    //an array, empty or otherwise, means other users are
    //already being processed.
    

    window.myOnTimeTeam = {

        apiCache : {},

        initializeViewModel: function (viewModel) {
            viewModel.defectId = ko.observable(0);
            viewModel.featureId = ko.observable(0);
            viewModel.incidentId = ko.observable(0);
            viewModel.projectId = ko.observable(0);
            viewModel.releaseId = ko.observable(0);

            return viewModel;
        },

        populateItemNames: function (defects, features, incidents) {
            var name = [];
            name.push( defects.data[0].filter_type);
            name.push(features.data[0].filter_type);
            name.push(incidents.data[0].filter_type);


            for (var i = 0; i<name.length ; i++)
                name[i] = name[i].charAt(0).toUpperCase() + name[i].slice(1);

            return name;
        },

        populateFilterArray: function (itemResponse,name) {
            itemArray = [];

            var none = {
                name: "All " + name,
                id: 0
            };

            itemArray.push(none);

            for (var i = 0 ; i < itemResponse.data.length ; i++)
                itemArray.push(itemResponse.data[i]);

            return itemArray;
        },

        populateItemFilterArray: function (defectArray, featureArray, incidentArray) {

            var itemArray = [];

         
            itemArray.push(defectArray);
            itemArray.push(featureArray);
            itemArray.push(incidentArray);

            return itemArray;
        },

        populateDesignArray: function (designResponse, name) {
            var designArray = [];


            var allDesign = {
                name: "All " + name,
                id: 0
            };
            designArray.push(allDesign);

            for (var i = 0 ; i < designResponse.data.length ; i++) {
                recursivepush(designResponse.data[i], designArray, 0);

            }

            return designArray;
        },

        populateUserModels: function (userResponse, viewModel) {

            var userModels = [];

            for (var i = 0, l = userResponse.data.length; i < l; i++) {
                userModels.push(new User(userResponse.data[i], viewModel.showHidden));
            }


            return userModels;

        },


        refreshData: function () {
            var viewModel = {}
            viewModel = window.myOnTimeTeam.initializeViewModel(viewModel);

            $.when(this.getUsersList(), this.getProjects(), this.getReleases(), this.getFilters('defects'), this.getFilters('features'), this.getFilters('incidents')).done(function (usersResponse, projectsResponse, releasesResponse, defectFilterResponse, featureFilterResponse, incidentFilterResponse) {
                if (!usersResponse || !usersResponse.data)
                    return;

                if (!projectsResponse || !projectsResponse.data)
                    return;

                if (!releasesResponse || !releasesResponse.data)
                    return;

                if (!defectFilterResponse || !defectFilterResponse.data)
                    return;

                if (!featureFilterResponse || !featureFilterResponse.data)
                    return;

                if (!incidentFilterResponse || !incidentFilterResponse.data)
                    return;




                var nameArray = window.myOnTimeTeam.populateItemNames(defectFilterResponse, featureFilterResponse, incidentFilterResponse);
                var defectFilterArray = window.myOnTimeTeam.populateFilterArray(defectFilterResponse, 'Defects');
                var featureFilterArray = window.myOnTimeTeam.populateFilterArray(featureFilterResponse, 'Features');
                var incidentFilterArray = window.myOnTimeTeam.populateFilterArray(incidentFilterResponse, 'Incidents');
                var itemFilters = window.myOnTimeTeam.populateItemFilterArray(defectFilterArray, featureFilterArray, incidentFilterArray);
                var projectArray = window.myOnTimeTeam.populateDesignArray(projectsResponse, 'Projects');
                var releaseArray = window.myOnTimeTeam.populateDesignArray(releasesResponse, 'Releases');



                 

                viewModel.itemTypes = ko.mapping.fromJS(nameArray);
                viewModel.itemFilters = ko.mapping.fromJS(itemFilters);
                viewModel.projects = ko.mapping.fromJS(projectArray);
                viewModel.releases = ko.mapping.fromJS(releaseArray);






                viewModel.sortBy = ko.observable(window.localStorage.getItem('sort') || "name");
                viewModel.showHidden = ko.observable(localStorage.getItem('showHidden') === "true");
                viewModel.showInactive = ko.observable(localStorage.getItem('showInactive') === "true");
                viewModel.filterProjectsBy = ko.observable(window.localStorage.getItem('filter') || "nofilter");
                viewModel.filterReleasesBy = ko.observable(window.localStorage.getItem('releasefilter') || "nofilter");
                viewModel.filterDefectsBy = ko.observable(window.localStorage.getItem('defectfilter') || "nofilter");
                viewModel.filterFeaturesBy = ko.observable(window.localStorage.getItem('featurefilter') || "nofilter");
                viewModel.filterIncidentsBy = ko.observable(window.localStorage.getItem('incidentfilter') || "nofilter");

                var userModels = window.myOnTimeTeam.populateUserModels(usersResponse, viewModel);
                viewModel.users = ko.observableArray(userModels);



              

                viewModel.usersSorted = ko.computed(function () {
                    var sortType = this.sortBy(),
                        sortFn,
                        visibleArray = $.grep(this.users(), function (user) {
                            return user.visible();
                        });

                    switch (sortType) {
                        case 'name':
                            return visibleArray;	//The list comes back from the server sorted by name, just return it
                        case 'work':
                            sortFn = function (a, b) {
                                return a.workRemainingMinutes() > b.workRemainingMinutes() ? -1 :
                                    a.workRemainingMinutes() < b.workRemainingMinutes() ? 1 :
                                    0;
                            };
                            break;
                        case 'defects':
                        case 'features':
                        case 'incidents':
                        case 'items':
                            sortFn = function (a, b) {
                                return a.getCount(sortType)() > b.getCount(sortType)() ? -1 :
                                    a.getCount(sortType)() < b.getCount(sortType)() ? 1 :
                                    0;
                            };
                            break;
                    }
                    return visibleArray.sort(sortFn);
                }, viewModel);
                viewModel.updateProject = ko.computed(function () {
                    var newFilter = this.projectId();
                    localStorage.setItem('filter', newFilter);
                    viewModel.filterProjectsBy(newFilter);
                    myOnTimeTeam.getUsersData(viewModel);

                }, viewModel);

                viewModel.updateRelease = ko.computed(function () {
                    var newReleaseFilter = this.releaseId();
                    localStorage.setItem('releasefilter', newReleaseFilter);
                    viewModel.filterReleasesBy(newReleaseFilter);
                    myOnTimeTeam.getUsersData(viewModel);

                }, viewModel);

                viewModel.updateDefect = ko.computed(function () {
                    var newDefectFilter = this.defectId();
                    localStorage.setItem('defectfilter', newDefectFilter);
                    viewModel.filterDefectsBy(newDefectFilter);
                    myOnTimeTeam.getUsersData(viewModel);

                }, viewModel);
                viewModel.updateFeature = ko.computed(function () {
                    var newFeatureFilter = this.featureId();
                    localStorage.setItem('featurefilter', newFeatureFilter);
                    viewModel.filterFeaturesBy(newFeatureFilter);
                    myOnTimeTeam.getUsersData(viewModel);
                }, viewModel);
                viewModel.updateIncident = ko.computed(function () {
                    var newIncidentFilter = this.incidentId();
                    localStorage.setItem('incidentfilter', newIncidentFilter);
                    viewModel.filterIncidentsBy(newIncidentFilter);
                    myOnTimeTeam.getUsersData(viewModel);
                }, viewModel);

                viewModel.updateInactiveUsers = ko.computed(function () {
                    localStorage.setItem("showInactive", viewModel.showInactive());
                    $.when(window.myOnTimeTeam.getUsersList()).done(function (usersResponse) {
                        var userModels = window.myOnTimeTeam.populateUserModels(usersResponse, viewModel);
                        viewModel.users(userModels);
                        myOnTimeTeam.getUsersData(viewModel);
                    });
                }, viewModel);
               






                myOnTimeTeam.getUsersData(viewModel);
           

                //});

                ko.applyBindings(viewModel);
            });

            return viewModel;
        },

    

        getUsersData: function (viewModel) {

            if (!viewModel.users())
                return;



            var hiddenUsersArray = window.localStorage.hiddenUsers.split(',');
            var found = false;


            for (var i = 0; i < viewModel.users().length ; i++) {
                found = false;
                for (var j = 0; j < hiddenUsersArray.length ; j++) {
                    if (hiddenUsersArray[j] === viewModel.users()[i].id.toString())
                        found = true;
                }
                    if (!found || viewModel.showHidden()) {
                        this.getUserDataCalls(viewModel.users()[i], viewModel);
                    }
                }

            },


        getUserDataCalls: function (user, viewModel) {
                 $.when(myOnTimeTeam.getItemDetailsForUser('defects', user.id, viewModel)
                , myOnTimeTeam.getItemDetailsForUser('features', user.id, viewModel)
                , myOnTimeTeam.getItemDetailsForUser('incidents', user.id, viewModel))
            .done(function (defects, features, incidents) {
                var getCount = function (itemType) {
                    if (itemType && itemType.metadata) {
                        return itemType.metadata.total_count;
                    } else {
                        return 0;
                    }
                };

                var getWorkRemainingMinutes = function (itemType) {
                    if (itemType && itemType.metadata) {
                        return itemType.metadata.minutes_remaining;
                    } else {
                        return 0;
                    }
                };

                // Update the data for this user in the viewModel knockout object
                user.defectsCount(getCount(defects));
                user.featuresCount(getCount(features));
                user.incidentsCount(getCount(incidents));
                user.workRemainingMinutes(Math.round((getWorkRemainingMinutes(defects)
                    + getWorkRemainingMinutes(features)
                    + getWorkRemainingMinutes(incidents))));
                user.dataLoaded(true);
            })
            .fail(function () {
            })
            .always(function () {
            });
        },

        getCurrentUserData: function () {
            return window.myOnTimeTeam.makeApiCall(this.getApiUrl('users/me', '&extend=all'), {});
        },

        getUsersList: function () {
            var querystring = '&extend=all';
            if (window.localStorage.getItem('showInactive') === 'false')
                querystring = '&include_inactive=false' + querystring;


            return window.myOnTimeTeam.makeApiCall(this.getApiUrl('users', querystring), {});
        },

        getItemDetailsForUser: function (itemType, userId, viewModel) {


            var target = this.getApiUrl(itemType, '&page=1&page_size=0&group_field=assigned_to_name&include_sub_project_items=true&columns=project,release&user_id=' + userId);

            if (!(viewModel.filterProjectsBy() === 'nofilter'))//if the ID isn't nofilter
                if (!(typeof viewModel.filterProjectsBy() === 'undefined'))//if the ID isn't undefined
                    if (!(viewModel.filterProjectsBy().toString() === '0')) //if the ID isnt 0 for "All Projects"
                        target = target + '&project_id=' + viewModel.filterProjectsBy();
            if (!(viewModel.filterReleasesBy() === 'nofilter'))//if the ID isn't nofilter
                if (!(typeof viewModel.filterReleasesBy() === 'undefined'))//if the ID isn't undefined
                    if (!(viewModel.filterReleasesBy().toString() === '0')) //if the ID isnt 0 for "All Releases"
                        target = target + '&release_id=' + viewModel.filterReleasesBy();

            if (itemType === 'defects')
                if (!(viewModel.filterDefectsBy() === 'nofilter'))//if the ID isn't nofilter
                    if (!(typeof viewModel.filterDefectsBy() === 'undefined'))//if the ID isn't undefined
                        if (!(viewModel.filterDefectsBy().toString() === '0'))
                            target = target + '&filter_id=' + viewModel.filterDefectsBy();
            if (itemType === 'features')
                if (!(viewModel.filterFeaturesBy() === 'nofilter'))//if the ID isn't nofilter
                    if (!(typeof viewModel.filterFeaturesBy() === 'undefined'))//if the ID isn't undefined
                        if (!(viewModel.filterFeaturesBy().toString() === '0'))
                            target = target + '&filter_id=' + viewModel.filterFeaturesBy();
            if (itemType === 'incidents')
                if (!(viewModel.filterIncidentsBy() === 'nofilter'))//if the ID isn't nofilter
                    if (!(typeof viewModel.filterIncidentsBy() === 'undefined'))//if the ID isn't undefined
                        if (!(viewModel.filterIncidentsBy().toString() === '0'))
                            target = target + '&filter_id=' + viewModel.filterIncidentsBy();



            return window.myOnTimeTeam.makeApiCall(target);
        },

        getApiUrl: function (route, queryString) {
            return window.siteRoot + '/ontime/proxy?resource=' + route + (queryString || "");
        },

        getProjects: function () {

            return window.myOnTimeTeam.makeApiCall(this.getApiUrl('projects', ''), {});
        },

        getFilters: function (itemType) {
            var querystring = "&type=" + itemType;
            return window.myOnTimeTeam.makeApiCall(this.getApiUrl('filters', querystring), {});
        },


        getReleases: function () {
            return window.myOnTimeTeam.makeApiCall(this.getApiUrl('releases', ''), {});
        },


        makeApiCall: function (url) {
            var deferredResponse = $.Deferred();

            if (myOnTimeTeam.apiCache && myOnTimeTeam.apiCache[url]) {

                deferredResponse.resolve(myOnTimeTeam.apiCache[url]);
            }

            else {
                var add = true;
                for (var i = 0 ; i < window.myOnTimeTeam.apiQueue.length; i++)
                {
                    if (url === window.myOnTimeTeam.apiQueue[i].url)
                        add = false;
                }
                if (add) {
                    window.myOnTimeTeam.apiQueue.push({
                        url: url,
                        deferredResponse: deferredResponse
                    });
                }
            }



            return deferredResponse;
        },

        processApiQueue: function () {
            var queue = window.myOnTimeTeam.apiQueue;

            if (!queue || !queue.length) return;


            var request = queue.shift();

            
            

            $.ajax(request.url, {}).done(function (response) {
                myOnTimeTeam.apiCache[request.url] = response;
                request.deferredResponse.resolve(response);
            });

        },

        apiQueue: []
    };

    window.setInterval(function () {
        myOnTimeTeam.processApiQueue();
    }, 175);



    var recursivepush = function (root, projarray, indentLevel) {
        root.value = root.id;


        projarray.push(root);
        if (root.hasOwnProperty('children')) {
            if (root.children != null) {
                for (var i = 0; i < root.children.length ; i++) {
                    recursivepush(root.children[i], projarray, indentLevel + 1);
                }
            }
        }
    }



}(window, document, jQuery));