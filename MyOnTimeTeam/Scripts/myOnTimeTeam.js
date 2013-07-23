(function (window, document, $) {
    function User(serverUser, showHiddenObservable) {
        this.id = serverUser.id;
        this.firstName = serverUser.first_name;
        this.lastName = serverUser.last_name;

        if (serverUser.use_gravatar === false)
            this.userImage = 'https://' + window.localStorage.getItem('userUrl') + '/' + serverUser.user_image.substring(serverUser.user_image.indexOf('api/v2'));
        else
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

        this.tasksCount = ko.observable(0);

        this.defectsShow = ko.computed(function () {
            return this.defectsCount().toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }, this);

        this.featuresShow = ko.computed(function () {
            return this.featuresCount().toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }, this);

        this.incidentsShow = ko.computed(function () {
            return this.incidentsCount().toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }, this);

        this.tasksShow = ko.computed(function () {
            return this.tasksCount().toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }, this);

        this.itemsCount = ko.computed(function () {
            return this.defectsCount() + this.featuresCount() + this.incidentsCount() + this.tasksCount();
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
        apiCache: {},

        initializeViewModel: function (viewModel) {
            viewModel.defectId = ko.observable(window.localStorage.getItem('defectfilter') || "0");
            viewModel.featureId = ko.observable(window.localStorage.getItem('featurefilter') || "0");
            viewModel.incidentId = ko.observable(window.localStorage.getItem('incidentfilter') || "0");
            viewModel.taskId = ko.observable(window.localStorage.getItem('taskfilter') || "0");
            viewModel.projectId = ko.observable(window.localStorage.getItem('filter') || "0");
            viewModel.releaseId = ko.observable(window.localStorage.getItem('releasefilter') || "0");
            viewModel.apiAlertMessage = ko.observable("empty");

            return viewModel;
        },

        populateItemNames: function (settings) {
            var name = [];
            if (settings.item_types.defects !== undefined)
                name.push(settings.item_types.defects.p_label);
            else
                name.push("null");

            if (settings.item_types.features !== undefined)
                name.push(settings.item_types.features.p_label);
            else
                name.push("null");

            if (settings.item_types.incidents !== undefined)
                name.push(settings.item_types.incidents.p_label);
            else
                name.push("null");

            if (settings.item_types.tasks !== undefined)
                name.push(settings.item_types.tasks.p_label);
            else
                name.push("null");


            return name;
        },

        populateFilterArray: function (itemResponse, name) {
            if (name === undefined)
                return;

            itemArray = [];


            var none = {
                name: "All " + name.p_label,
                id: 0
            };

            var noitem = {
                name: "No " + name.p_label,
                id: -2
            };

            var separator = {
                name: "----------------",
                id: -1
            };

            //create the nofilter option and a separator
            itemArray.push(none);
            itemArray.push(noitem);
            itemArray.push(separator);

            //add all the private filters
            for (var i = 0 ; i < itemResponse.data.length ; i++) {
                if (itemResponse.data[i].private) {
                    itemArray.push(itemResponse.data[i]);
                }
            }

            //if any private filters exist, add another separator
            if (itemArray.length > 3) {
                itemArray.push(separator);
            }

            //push any public filters onto the list
            for (var j = 0 ; j < itemResponse.data.length ; j++) {
                if (!itemResponse.data[j].private) {
                    itemArray.push(itemResponse.data[j]);
                }
            }

            return itemArray;
        },

        populateItemFilterArray: function (defectArray, featureArray, incidentArray, taskArray, settings) {
            var itemArray = [];

            if (settings.item_types.defects !== undefined)
                itemArray.push(defectArray);
            else
                itemArray.push("null");
            if (settings.item_types.features !== undefined)
                itemArray.push(featureArray);
            else
                itemArray.push("null");
            if (settings.item_types.incidents !== undefined)
                itemArray.push(incidentArray);
            else
                itemArray.push("null");

            if (settings.item_types.tasks !== undefined)
                itemArray.push(taskArray);
            else
                itemArray.push("null");

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

            $.when(this.getUsersList(), this.getProjects(), this.getReleases(), this.getFilters('defects'), this.getFilters('features'), this.getFilters('incidents'), this.getFilters('tasks'), this.getSettings()).done(function (usersResponse, projectsResponse, releasesResponse, defectFilterResponse, featureFilterResponse, incidentFilterResponse, taskFilterResponse, settingsResponse) {
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

                if (!taskFilterResponse || !taskFilterResponse.data)
                    return;

                var nameArray = window.myOnTimeTeam.populateItemNames(settingsResponse);
                var defectFilterArray = window.myOnTimeTeam.populateFilterArray(defectFilterResponse, settingsResponse.item_types.defects);
                var featureFilterArray = window.myOnTimeTeam.populateFilterArray(featureFilterResponse, settingsResponse.item_types.features);
                var incidentFilterArray = window.myOnTimeTeam.populateFilterArray(incidentFilterResponse, settingsResponse.item_types.incidents);
                var taskFilterArray = window.myOnTimeTeam.populateFilterArray(taskFilterResponse, settingsResponse.item_types.tasks);
                var itemFilters = window.myOnTimeTeam.populateItemFilterArray(defectFilterArray, featureFilterArray, incidentFilterArray, taskFilterArray, settingsResponse);
                var projectArray = window.myOnTimeTeam.populateDesignArray(projectsResponse, 'Projects');
                var releaseArray = window.myOnTimeTeam.populateDesignArray(releasesResponse, 'Releases');

                viewModel.itemTypes = ko.mapping.fromJS(nameArray);
                viewModel.itemFilters = ko.mapping.fromJS(itemFilters);
                viewModel.projects = ko.mapping.fromJS(projectArray);

                viewModel.releases = ko.observableArray(releaseArray);
                viewModel.sortBy = ko.observable(window.localStorage.getItem('sort') || "name");
                viewModel.showHidden = ko.observable(localStorage.getItem('showHidden') === "true");
                viewModel.showInactive = ko.observable(localStorage.getItem('showInactive') === "true");
                viewModel.filterProjectsBy = ko.observable(window.localStorage.getItem('filter') || "nofilter");
                viewModel.filterReleasesBy = ko.observable(window.localStorage.getItem('releasefilter') || "nofilter");
                viewModel.filterDefectsBy = ko.observable(window.localStorage.getItem('defectfilter') || "nofilter");
                viewModel.filterFeaturesBy = ko.observable(window.localStorage.getItem('featurefilter') || "nofilter");
                viewModel.filterIncidentsBy = ko.observable(window.localStorage.getItem('incidentfilter') || "nofilter");
                viewModel.filterTasksBy = ko.observable(window.localStorage.getItem('taskfilter') || "nofilter");
                viewModel.filterReleasesBool = ko.observable(window.localStorage.getItem('filterReleases') === "true");

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
                        case 'tasks':
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
                    viewModel.filterProjectsBy(newFilter);
                    myOnTimeTeam.getUsersData(viewModel);
                    $('.projectlist :selected').removeAttr('select');
                    $(".projectlist [value='" + newFilter + "']").attr('select', 'select');
                    localStorage.setItem('filter', $('.projectlist :selected').val());
                    localStorage.setItem("filterReleases", viewModel.filterReleasesBool());
                    var filterparam = '';
                    if (this.filterReleasesBool() === true)
                        filterparam = '&filter_by_project_id=' + newFilter;
                    $.when(myOnTimeTeam.getReleases(filterparam)).done(function (newReleaseReponse) { viewModel.releases(window.myOnTimeTeam.populateDesignArray(newReleaseReponse, 'Releases')) });
                }, viewModel);

                viewModel.updateRelease = ko.computed(function () {
                    var newReleaseFilter = this.releaseId();
                    viewModel.filterReleasesBy(newReleaseFilter);
                    myOnTimeTeam.getUsersData(viewModel);
                    $('.releaselist :selected').removeAttr('select');
                    $(".releaselist [value='" + newReleaseFilter + "']").attr('select', 'select');
                    localStorage.setItem('releasefilter', $('.releaselist :selected').val());
                }, viewModel);

                viewModel.updateDefect = ko.computed(function () {
                    var newDefectFilter = this.defectId();
                    if (newDefectFilter !== '-1') {
                        viewModel.filterDefectsBy(newDefectFilter);
                        myOnTimeTeam.getUsersData(viewModel);
                        $('.defectlist :selected').removeAttr('select');
                        $(".defectlist [value='" + newDefectFilter + "']").attr('select', 'select');
                        localStorage.setItem('defectfilter', $('.defectlist :selected').val());
                    }

                }, viewModel);
                viewModel.updateFeature = ko.computed(function () {
                    var newFeatureFilter = this.featureId();
                    if (newFeatureFilter !== '-1') {
                        viewModel.filterFeaturesBy(newFeatureFilter);
                        myOnTimeTeam.getUsersData(viewModel);
                        $('.featurelist :selected').removeAttr('select');
                        $(".featurelist [value='" + newFeatureFilter + "']").attr('select', 'select');
                        localStorage.setItem('featurefilter', $('.featurelist :selected').val());
                    }
                }, viewModel);

                viewModel.updateIncident = ko.computed(function () {
                    var newIncidentFilter = this.incidentId();
                    if (newIncidentFilter !== '-1') {
                        viewModel.filterIncidentsBy(newIncidentFilter);
                        myOnTimeTeam.getUsersData(viewModel);
                        $('.incidentlist :selected').removeAttr('select');
                        $(".incidentlist [value='" + newIncidentFilter + "']").attr('select', 'select');
                        localStorage.setItem('incidentfilter', $('.incidentlist :selected').val());
                    }
                }, viewModel);

                viewModel.updateTask = ko.computed(function () {
                    var newTaskFilter = this.taskId();
                    if (newTaskFilter !== '-1') {
                        viewModel.filterTasksBy(newTaskFilter);
                        myOnTimeTeam.getUsersData(viewModel);
                        $('.tasklist :selected').removeAttr('select');
                        $(".tasklist [value='" + newTaskFilter + "']").attr('select', 'select');
                        localStorage.setItem('taskfilter', $('.tasklist :selected').val());
                    }
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
                    this.getUserDataCalls(viewModel, i);
                }
            }
        },


        getUserDataCalls: function (viewModel, index) {
            $.when(myOnTimeTeam.getItemDetailsForUser('defects', viewModel.users()[index].id, viewModel)
                , myOnTimeTeam.getItemDetailsForUser('features', viewModel.users()[index].id, viewModel)
                , myOnTimeTeam.getItemDetailsForUser('incidents', viewModel.users()[index].id, viewModel)
                , myOnTimeTeam.getItemDetailsForUser('tasks', viewModel.users()[index].id, viewModel))
            .done(function (defects, features, incidents, tasks) {
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
                var defectsRemainingMinutes = getWorkRemainingMinutes(defects);
                var featuresRemainingMinutes = getWorkRemainingMinutes(features);
                var incidentsRemainingMinutes = getWorkRemainingMinutes(incidents);
                var tasksRemainingMinutes = getWorkRemainingMinutes(tasks);

                var workRemainingMinutes = Math.round(defectsRemainingMinutes
                    + featuresRemainingMinutes
                    + incidentsRemainingMinutes
                    + tasksRemainingMinutes);

                viewModel.users()[index].workRemainingMinutes(workRemainingMinutes);

                if (viewModel.filterDefectsBy() === -2) {
                    viewModel.users()[index].defectsCount(0);
                    viewModel.users()[index].workRemainingMinutes(workRemainingMinutes - defectsRemainingMinutes);
                }
                else
                    viewModel.users()[index].defectsCount(getCount(defects));
                if (viewModel.filterFeaturesBy() === -2) {
                    viewModel.users()[index].featuresCount(0);
                    viewModel.users()[index].workRemainingMinutes(workRemainingMinutes - featuresRemainingMinutes);
                }
                else
                    viewModel.users()[index].featuresCount(getCount(features));
                if (viewModel.filterIncidentsBy() === -2) {
                    viewModel.users()[index].incidentsCount(0);
                    viewModel.users()[index].workRemainingMinutes(workRemainingMinutes - incidentsRemainingMinutes);
                }
                else
                    viewModel.users()[index].incidentsCount(getCount(incidents));
                if (viewModel.filterTasksBy() === -2) {
                    viewModel.users()[index].tasksCount(0);
                    viewModel.users()[index].workRemainingMinutes(workRemainingMinutes - tasksRemainingMinutes);
                }
                else
                    viewModel.users()[index].tasksCount(getCount(tasks));

                viewModel.users()[index].dataLoaded(true);
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
            var target = this.getApiUrl(itemType, '&page=1&page_size=0&group_field=assigned_to_name&include_sub_projects_items=true&include_sub_releases_items=true&columns=project,release&user_id=' + userId);

            if (!(viewModel.filterProjectsBy() === 'nofilter'))//if the ID isn't nofilter
                if (!(typeof viewModel.filterProjectsBy() === 'undefined'))//if the ID isn't undefined
                    if (!(viewModel.filterProjectsBy().toString() === '0')) //if the ID isnt 0 for "All Projects"
                        target = target + '&project_id=' + viewModel.filterProjectsBy();
            if (!(viewModel.filterReleasesBy() === 'nofilter'))//if the ID isn't nofilter
                if (!(typeof viewModel.filterReleasesBy() === 'undefined'))//if the ID isn't undefined
                    if (!(viewModel.filterReleasesBy().toString() === '0')) //if the ID isnt 0 for "All Releases"
                        target = target + '&release_id=' + viewModel.filterReleasesBy();

            if (itemType === 'defects') {

                if (!(viewModel.filterDefectsBy() === 'nofilter'))//if the ID isn't nofilter
                    if (!(typeof viewModel.filterDefectsBy() === 'undefined'))//if the ID isn't undefined
                        if (!(viewModel.filterDefectsBy().toString() === '0'))
                            target = target + '&filter_id=' + viewModel.filterDefectsBy();
            }
            if (itemType === 'features') {

                if (!(viewModel.filterFeaturesBy() === 'nofilter'))//if the ID isn't nofilter
                    if (!(typeof viewModel.filterFeaturesBy() === 'undefined'))//if the ID isn't undefined
                        if (!(viewModel.filterFeaturesBy().toString() === '0'))
                            target = target + '&filter_id=' + viewModel.filterFeaturesBy();
            }
            if (itemType === 'incidents') {

                if (!(viewModel.filterIncidentsBy() === 'nofilter'))//if the ID isn't nofilter
                    if (!(typeof viewModel.filterIncidentsBy() === 'undefined'))//if the ID isn't undefined
                        if (!(viewModel.filterIncidentsBy().toString() === '0'))
                            target = target + '&filter_id=' + viewModel.filterIncidentsBy();
            }
            if (itemType === 'tasks') {
           
                if (!(viewModel.filterTasksBy() === 'nofilter'))//if the ID isn't nofilter
                    if (!(typeof viewModel.filterTasksBy() === 'undefined'))//if the ID isn't undefined
                        if (!(viewModel.filterTasksBy().toString() === '0'))
                            target = target + '&filter_id=' + viewModel.filterTasksBy();
            }
            return window.myOnTimeTeam.makeApiCall(target);
        },

        getApiUrl: function (route, queryString) {
            return window.siteRoot + 'ontime/proxy?resource=' + route + (queryString || "");
        },

        getProjects: function () {
            return window.myOnTimeTeam.makeApiCall(this.getApiUrl('projects', '&include_inactive_projects=false'), {});
        },

        getFilters: function (itemType) {
            var querystring = "&type=" + itemType;
            return window.myOnTimeTeam.makeApiCall(this.getApiUrl('filters', querystring), {});
        },

        getReleases: function (filterid) {
            return window.myOnTimeTeam.makeApiCall(this.getApiUrl('releases', '&include_inactive_releases=false' + filterid), {});
        },

        getSettings: function () {
            return window.myOnTimeTeam.makeApiCall(this.getApiUrl('settings', ''), {});
        },

        makeApiCall: function (url) {
            var deferredResponse = $.Deferred();

            if (myOnTimeTeam.apiCache && myOnTimeTeam.apiCache[url]) {
                deferredResponse.resolve(myOnTimeTeam.apiCache[url]);
            }

            else {
                var add = true;
                for (var i = 0 ; i < window.myOnTimeTeam.apiQueue.length; i++) {
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
            var date = new Date();

            var apiCall = window.localStorage.getItem('apiCallCounter');
            var apidate = window.localStorage.getItem('apiDate');

            $.ajax(request.url, {}).done(function (response) {
                if (apidate === date.getDate() + '/' + date.getMonth() + '/' + date.getYear()) {
                    window.localStorage.setItem('apiCallCounter', (parseInt(apiCall, 10) + 1));
                    if (apiCall === '500') {
                        viewModel.apiAlertMessage("My OnTime Team has used approximately 500 API calls today. OnTime allows a maximum of 1000 calls per day.");
                        $('#apiModal').modal({ show: true });
                    }
                    if (apiCall === '750') {
                        viewModel.apiAlertMessage("My OnTime Team has used approximately 750 API calls today. OnTime allows a maximum of 1000 calls per day.");
                        $('#apiModal').modal({ show: true });
                    }
                    if (apiCall === '1000') {
                        viewModel.apiAlertMessage("My OnTime Team has reached the 1000 API call limit. The program will not function until tomorrow.");
                        $('#apiModal').modal({ show: true });
                    }
                }
                myOnTimeTeam.apiCache[request.url] = response;
                request.deferredResponse.resolve(response);
            }).fail(function (response) {
                $('#errorModal').modal({ show: true });

            });


        },

        apiQueue: []
    };

    window.setInterval(function () {
        myOnTimeTeam.processApiQueue();
    }, 50);

    var recursivepush = function (root, projarray, indentLevel) {
        root.value = root.id;
        for (var i = 0 ; i < indentLevel ; i++) {
            root.name = "\xA0\xA0" + root.name;
        }
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