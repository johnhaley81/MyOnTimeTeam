(function (window, document, $) {
	function User(serverUser) {
		this.id = serverUser.id;
		this.firstName = serverUser.first_name;
		this.lastName = serverUser.last_name;
		this.userImage = serverUser.user_image;

		this.dataLoaded = ko.observable(false);

		this.fullName = ko.computed(function () {
			return this.firstName + " " + this.lastName;
		}, this);

		this.defectsCount = ko.observable(0);

		this.featuresCount = ko.observable(0);

		this.incidentsCount = ko.observable(0);

		this.workRemaining = ko.observable("0 Hours");
	};

	window.myOnTimeTeam = {
		refreshData: function() {
			this.getAllUsersData().done(function(response) {
				if (!response || !response.data)
					return;
				
				var users = response.data,
					userModels = [],
					usersWaitingForData = [],
					viewModel = {};

				for (var i = 0, l = users.length; i < l; i++) {
					userModels.push(new User(users[i]));
				}

				viewModel.users = ko.observableArray(userModels);
				ko.applyBindings(viewModel);

				// now copy the users from the view model into the array of users waiting for data so we can loop over them
				// without disturbing the original view model
				for (var i = 0, l = viewModel.users().length; i < l; i++) {
					usersWaitingForData.push(viewModel.users()[i]);
				}

				myOnTimeTeam.getNextUsersData(usersWaitingForData);
			});
		},

		getNextUsersData: function (usersWaitingForData) {
			var user = (usersWaitingForData || []).shift();
			if (!user)
				return;

			$.when(myOnTimeTeam.getItemDetailsForUser('defects', user.id)
					, myOnTimeTeam.getItemDetailsForUser('features', user.id)
					, myOnTimeTeam.getItemDetailsForUser('incidents', user.id))
				.done(function (defects, features, incidents) {
					var getCount = function (itemType) {
						if (itemType && itemType[0] && itemType[0].metadata) {
							return itemType[0].metadata.total_count;
						} else {
							return 0;
						}
					};

					var getWorkRemainingMinutes = function (itemType) {
						if (itemType && itemType[0] && itemType[0].metadata) {
							return itemType[0].metadata.minutes_remaining;
						} else {
							return 0;
						}
					};

					// Update the data for this user in the viewModel knockout object
					user.defectsCount(getCount(defects));
					user.featuresCount(getCount(features));
					user.incidentsCount(getCount(incidents));
					user.workRemaining(
						Math.round((getWorkRemainingMinutes(defects)
						+ getWorkRemainingMinutes(features)
						+ getWorkRemainingMinutes(incidents))
						/ 60) + " Hours");
					user.dataLoaded(true);

					setTimeout(function () {
						myOnTimeTeam.getNextUsersData(usersWaitingForData);
					}, 333);
				})
				.fail(function () {
					//Something failed. We're probably making too many requests at a time. Add
					//this user back to the list, wait a second, then start the requests again.
					usersWaitingForData.unshift(user);
					setTimeout(function () {
						myOnTimeTeam.getNextUsersData(usersWaitingForData);
					}, 1000);
				})
				.always(function () {

				});
		},

		getCurrentUserData: function () {
			return $.ajax(this.getApiUrl('users/me', '&extend=all'), {});
		},

		getAllUsersData: function () {
			return $.ajax(this.getApiUrl('users', '&include_inactive=false&extend=all'), {});
		},

		getItemDetailsForUser: function (itemType, userId) {
			return $.ajax(this.getApiUrl(itemType, '&page=1&page_size=0&group_field=assigned_to_name&columns=id&user_id=' + userId), {});
		},

		getApiUrl: function (route, queryString) {
			return '/ontime/proxy?resource=' + route + (queryString || "");
		}
	};
}(window, document, jQuery));