import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, SafeAreaView } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import Icon from 'react-native-vector-icons/Ionicons';

const jobsData = [
  {
    id: '1',
    title: 'Software Engineer',
    company: 'Tech Innovators Inc.',
    location: 'San Francisco',
    type: 'Remote',
    image: '🌱',
  },
  {
    id: '2',
    title: 'Product Manager',
    company: 'Global Solutions Co.',
    location: 'New York',
    type: 'Remote',
    image: '🌿',
  },
];

const JobCard = ({ job, bookmarked, onBookmarkToggle }) => (
  <View style={styles.card}>
    <View style={{ flex: 1 }}>
      <Text style={styles.remote}>{job.type}</Text>
      <Text style={styles.title}>{job.title}</Text>
      <Text style={styles.subtitle}>{job.company} · {job.location}</Text>
      <TouchableOpacity onPress={() => onBookmarkToggle(job.id)} style={styles.bookmarkBtn}>
        <Text style={styles.bookmarkText}>Bookmark</Text>
        <Icon name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={20} />
      </TouchableOpacity>
    </View>
    <View style={styles.imageContainer}>
      <Text style={{ fontSize: 40 }}>{job.image}</Text>
    </View>
  </View>
);

const JobsScreen = () => {
  const [search, setSearch] = useState('');
  const [selectedTab, setSelectedTab] = useState('All');
  const [bookmarks, setBookmarks] = useState([]);

  const [locationOpen, setLocationOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);

  const [location, setLocation] = useState(null);
  const [role, setRole] = useState(null);
  const [company, setCompany] = useState(null);

  const toggleBookmark = (id) => {
    setBookmarks((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const filteredJobs = jobsData.filter((job) => {
    const inSearch = job.title.toLowerCase().includes(search.toLowerCase());
    const inTab = selectedTab === 'All' || bookmarks.includes(job.id);
    return inSearch && inTab;
  });

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Jobs</Text>

      {/* Search Bar */}
      <TextInput
        placeholder="Search for jobs"
        value={search}
        onChangeText={setSearch}
        style={styles.searchBar}
      />

      {/* Tabs */}
      <View style={styles.tabs}>
        {['All', 'Saved'].map((tab) => (
          <TouchableOpacity key={tab} onPress={() => setSelectedTab(tab)}>
            <Text style={[styles.tabText, selectedTab === tab && styles.activeTab]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        <DropDownPicker
          open={locationOpen}
          value={location}
          items={[{ label: 'San Francisco', value: 'sf' }, { label: 'New York', value: 'ny' }]}
          setOpen={setLocationOpen}
          setValue={setLocation}
          placeholder="Location"
          containerStyle={styles.dropdown}
        />
        <DropDownPicker
          open={roleOpen}
          value={role}
          items={[{ label: 'Engineer', value: 'eng' }, { label: 'Manager', value: 'pm' }]}
          setOpen={setRoleOpen}
          setValue={setRole}
          placeholder="Role"
          containerStyle={styles.dropdown}
        />
        <DropDownPicker
          open={companyOpen}
          value={company}
          items={[{ label: 'Tech Innovators Inc.', value: 'tech' }, { label: 'Global Solutions Co.', value: 'global' }]}
          setOpen={setCompanyOpen}
          setValue={setCompany}
          placeholder="Company"
          containerStyle={styles.dropdown}
        />
      </View>

      {/* Job List */}
      <FlatList
        data={filteredJobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <JobCard
            job={item}
            bookmarked={bookmarks.includes(item.id)}
            onBookmarkToggle={toggleBookmark}
          />
        )}
        style={{ marginTop: 10 }}
      />
    </SafeAreaView>
  );
};

export default JobsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  searchBar: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  tabs: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 10,
  },
  tabText: {
    fontSize: 16,
    color: '#999',
  },
  activeTab: {
    color: '#000',
    fontWeight: 'bold',
  },
  filters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 5,
  },
  dropdown: {
    flex: 1,
    zIndex: 1000,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  remote: {
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  subtitle: {
    color: '#666',
    marginBottom: 10,
  },
  bookmarkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bookmarkText: {
    color: '#444',
  },
  imageContainer: {
    marginLeft: 12,
    backgroundColor: '#e0e0e0',
    width: 60,
    height: 60,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
