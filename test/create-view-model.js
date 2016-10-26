"use strict";

const utils = require("../");
const mobx = require("mobx");
const test = require("tape");

mobx.useStrict(true);

test("create view model", t => {
    function Todo(title, done, usersInterested) {
        mobx.extendObservable(this, {
            title: title,
            done: done,
            usersInterested: usersInterested,
        });
    }

    const model = new Todo("coffee", false, ["Vader", "Madonna"]);
    const viewModel = utils.createViewModel(model);

    let tr;
    let vr;
    // original rendering
    const d1 = mobx.autorun(() => {
        tr = model.title + ":" + model.done + ",interested:" + model.usersInterested.slice().toString();
    });
    // view model rendering
    const d2 = mobx.autorun(() => {
        vr = viewModel.title + ":" + viewModel.done + ",interested:" + viewModel.usersInterested.slice().toString();
    });

    t.equal(tr, "coffee:false,interested:Vader,Madonna")
    t.equal(vr, "coffee:false,interested:Vader,Madonna")
    t.pass(vr.usersInterested === tr.usersInterested)


    mobx.runInAction(() =>  model.title = "tea")
    t.equal(tr, "tea:false,interested:Vader,Madonna")
    t.equal(vr, "tea:false,interested:Vader,Madonna") // change reflected in view model
    t.equal(viewModel.isDirty, false)

    mobx.runInAction(() =>  model.usersInterested.push("Tarzan"))
    t.equal(tr, "tea:false,interested:Vader,Madonna,Tarzan")
    t.equal(vr, "tea:false,interested:Vader,Madonna,Tarzan") // change reflected in view model
    t.equal(viewModel.isDirty, false)

    mobx.runInAction(() =>  viewModel.done = true)
    t.equal(tr, "tea:false,interested:Vader,Madonna,Tarzan")
    t.equal(vr, "tea:true,interested:Vader,Madonna,Tarzan")
    t.equal(viewModel.isDirty, true)
    t.equal(viewModel.isPropertyDirty("title"), false)
    t.equal(viewModel.isPropertyDirty("done"), true)
    t.equal(viewModel.isPropertyDirty("usersInterested"), false)

    const newUsers = ["Putin", "Madonna", "Tarzan"];
    mobx.runInAction(() =>  viewModel.usersInterested = newUsers)
    t.equal(tr, "tea:false,interested:Vader,Madonna,Tarzan")
    t.equal(vr, "tea:true,interested:Putin,Madonna,Tarzan")
    t.equal(viewModel.isDirty, true)
    t.equal(viewModel.isPropertyDirty("title"), false)
    t.equal(viewModel.isPropertyDirty("done"), true)
    t.equal(viewModel.isPropertyDirty("usersInterested"), true)

    mobx.runInAction(() =>  model.usersInterested.push("Cersei"))
    t.equal(tr, "tea:false,interested:Vader,Madonna,Tarzan,Cersei")
    t.equal(vr, "tea:true,interested:Putin,Madonna,Tarzan") // change NOT reflected in view model bcs users are dirty
    t.equal(viewModel.isDirty, true)
    t.equal(viewModel.isPropertyDirty("title"), false)
    t.equal(viewModel.isPropertyDirty("done"), true)
    t.equal(viewModel.isPropertyDirty("usersInterested"), true)

    // should reset
    viewModel.reset();
    t.equal(tr, "tea:false,interested:Vader,Madonna,Tarzan,Cersei")
    t.equal(vr, "tea:false,interested:Vader,Madonna,Tarzan,Cersei")
    t.equal(viewModel.isDirty, false)
    t.equal(viewModel.isPropertyDirty("title"), false)
    t.equal(viewModel.isPropertyDirty("done"), false)
    t.equal(viewModel.isPropertyDirty("usersInterested"), false)
    t.pass(vr.usersInterested === tr.usersInterested)

    mobx.runInAction(() =>  {model.usersInterested.pop();model.usersInterested.pop();})
    t.equal(tr, "tea:false,interested:Vader,Madonna")
    t.equal(vr, "tea:false,interested:Vader,Madonna")
    t.equal(viewModel.isDirty, false)
    t.equal(viewModel.isPropertyDirty("title"), false)
    t.equal(viewModel.isPropertyDirty("done"), false)
    t.equal(viewModel.isPropertyDirty("usersInterested"), false)

    mobx.runInAction(() =>  {viewModel.title = "cola"; viewModel.usersInterested = newUsers;})
    t.equal(tr, "tea:false,interested:Vader,Madonna")
    t.equal(vr, "cola:false,interested:Putin,Madonna,Tarzan")
    t.equal(viewModel.isDirty, true)
    t.equal(viewModel.isPropertyDirty("done"), false)
    t.equal(viewModel.isPropertyDirty("title"), true)
    t.equal(viewModel.isPropertyDirty("usersInterested"), true)

    // model changes should not update view model which is dirty
    mobx.runInAction(() =>  model.title = "coffee")
    t.equal(tr, "coffee:false,interested:Vader,Madonna")
    t.equal(vr, "cola:false,interested:Putin,Madonna,Tarzan")

    viewModel.submit();
    t.equal(tr, "cola:false,interested:Putin,Madonna,Tarzan")
    t.equal(vr, "cola:false,interested:Putin,Madonna,Tarzan")
    t.equal(viewModel.isDirty, false)
    t.equal(viewModel.isPropertyDirty("done"), false)
    t.equal(viewModel.isPropertyDirty("title"), false)
    t.equal(viewModel.isPropertyDirty("usersInterested"), false)

    d1()
    d2()
    t.end()
})

test("create view model deep object", t => {
    function Todo(title, done, usersInterested, location) {
        mobx.extendObservable(this, {
            title: title,
            done: done,
            usersInterested: usersInterested,
            location: location
        });
    }

    const location = mobx.observable({
        city: "London", 
        street: "Baker Street", 
        house: mobx.observable({
            number: "221", 
            building: "B"
        })
    })
    const model = new Todo("coffee", false, ["Vader", "Madonna"], location);
    const viewModel = utils.createViewModel(model);

    mobx.runInAction(() => viewModel.location.city = "Liverpool");
    t.equal(viewModel.location.city, "Liverpool");
    t.equal(location.city, "London");
    t.equal(viewModel.isPropertyDirty("location"), false);
    t.equal(viewModel.isDirty, false);
    t.equal(viewModel.isDirtyDeep, true);

    viewModel.reset();
    t.equal(viewModel.location.city, "London");
    t.equal(viewModel.location.model, location);
    t.equal(viewModel.isDirty, false);
    t.equal(viewModel.isDirtyDeep, false);

    mobx.runInAction(() => viewModel.location.city = "Liverpool");
    viewModel.submit();
    t.equal(viewModel.location.city, "Liverpool");
    t.equal(location.city, "Liverpool");
    t.equal(viewModel.isDirty, false);
    t.equal(viewModel.isDirtyDeep, false);

    mobx.runInAction(() => viewModel.location = mobx.observable({city: "Agraba"}));
    t.equal(viewModel.location.city, "Agraba");
    t.equal(viewModel.isDirtyDeep, true);

    viewModel.reset();
    t.equal(viewModel.location.city, "Liverpool");

    mobx.runInAction(() => viewModel.location.house.number = "223");
    t.equal(viewModel.location.house.number, "223");
    t.equal(location.house.number, "221");
    t.equal(viewModel.isDirtyDeep, true);

    viewModel.submit();
    t.equal(viewModel.location.house.number, "223");
    t.equal(location.house.number, "223");
    t.equal(viewModel.isDirtyDeep, false);

    mobx.runInAction(() => viewModel.location.house = mobx.observable({number: "446", building: "A"}));
    t.equal(viewModel.location.house.number, "446");
    t.equal(viewModel.isDirtyDeep, true);

    viewModel.reset();
    t.equal(viewModel.location.house.number, "223");
    t.equal(viewModel.isDirtyDeep, false);
    
    mobx.runInAction(() => viewModel.location.house = mobx.observable({number: "446", building: "A"}));
    viewModel.submit();
    t.equal(viewModel.location.house.number, "446");
    t.equal(viewModel.isDirtyDeep, false);

    t.end();
})
