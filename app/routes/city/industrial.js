import Ember from 'ember';

export default Ember.Route.extend({

  model() {
    const cityModel = this.modelFor('city');

    return Ember.RSVP.hash({
      sectorData: cityModel.sectorData['industrial'],
      municipality: cityModel.municipality,
    });
  }

});
